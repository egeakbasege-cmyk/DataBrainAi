"""
app/agents/predictive_signal.py

Predictive Signal Agent

Responsibilities:
  1. Detect statistical anomalies in TrendSignal streams (z-score vs rolling baseline).
  2. Forecast price / inventory depletion events using linear trend extrapolation.
  3. Emit AnomalyDetected domain events for Motor Mode webhook dispatch.
  4. Persist significant forecasts to Pinecone NS_TRENDS for historical retrieval.

Anomaly detection:
  - Computes z-score: (current_value - baseline) / std_dev
  - σ ≥ settings.alert_anomaly_threshold → anomaly flagged
  - σ ≥ 3.0 → critical alert (triggers Telegram/WhatsApp)

Forecast:
  - Simple linear regression over last N observations for each metric.
  - LLM adds qualitative interpretation and confidence bounds.

Node output keys: ps_forecasts, ps_anomalies, ps_volatility_map
"""

from __future__ import annotations

import json
import math
import statistics
from collections import defaultdict
from typing import Any

import structlog
from groq import AsyncGroq
from langchain_core.messages import AIMessage

from app.agents.state import AgentState
from app.config import get_settings
from app.core.events import bus, AnomalyDetected, HITLActionQueued
from app.ontology.models import TrendSignal
from app.vector.pinecone_client import PineconeClient, NS_TRENDS

logger   = structlog.get_logger(__name__)
settings = get_settings()

_FORECAST_SYSTEM = """You are a quantitative market analyst. You receive time-series data
for a set of market metrics and must:

1. Identify the trend direction (rising/falling/stable/volatile).
2. Estimate a 7-day and 30-day forecast value with confidence bounds.
3. Flag inventory or price depletion risk if applicable.

Return ONLY valid JSON, no markdown:
{
  "forecasts": [
    {
      "entity_id": "string",
      "metric": "string",
      "trend_direction": "rising|falling|stable|volatile",
      "current_value": float,
      "forecast_7d": float,
      "forecast_30d": float,
      "confidence": "high|medium|low",
      "risk_flag": "none|price_spike|inventory_depletion|market_exit",
      "rationale": "string"
    }
  ]
}
"""


# ── Statistical helpers ───────────────────────────────────────────────────────

def _zscore(value: float, baseline: float, std: float) -> float:
    if std == 0:
        return 0.0
    return (value - baseline) / std


def _linear_forecast(values: list[float], steps: int) -> float:
    """Simple OLS slope extrapolation."""
    n = len(values)
    if n < 2:
        return values[-1] if values else 0.0
    xs = list(range(n))
    x_mean = statistics.mean(xs)
    y_mean = statistics.mean(values)
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
    den = sum((x - x_mean) ** 2 for x in xs)
    slope = num / den if den != 0 else 0.0
    return values[-1] + slope * steps


def _volatility(values: list[float]) -> float:
    """Coefficient of variation — normalised volatility 0..1."""
    if len(values) < 2:
        return 0.0
    mean = statistics.mean(values)
    if mean == 0:
        return 0.0
    return min(1.0, statistics.stdev(values) / abs(mean))


class PredictiveSignalAgent:
    """
    LangGraph node — Predictive Signal.
    Statistical anomaly detection + LLM-interpreted forecast.
    """

    def __init__(self, pinecone: PineconeClient) -> None:
        self._pc   = pinecone
        self._groq = AsyncGroq(api_key=settings.groq_api_key)

    async def run(self, state: AgentState) -> AgentState:
        log = logger.bind(agent="predictive_signal", job_id=state.get("job_id"))
        log.info("agent_start")

        trend_signals: list[TrendSignal] = state.get("trend_signals", [])

        if not trend_signals:
            log.warning("no_trend_signals_skipping")
            return {
                **state,
                "ps_forecasts":      [],
                "ps_anomalies":      [],
                "ps_volatility_map": {},
                "completed_agents":  [
                    *state.get("completed_agents", []), "predictive_signal"
                ],
            }

        # ── Group signals by (entity_id, metric) ─────────────────────────────
        groups: dict[tuple[str, str], list[TrendSignal]] = defaultdict(list)
        for sig in trend_signals:
            groups[(sig.entity_id, sig.metric)].append(sig)

        # Sort each group chronologically
        for key in groups:
            groups[key].sort(key=lambda s: s.observed_at)

        anomalies:      list[dict[str, Any]] = []
        volatility_map: dict[str, float]    = {}
        series_for_llm: list[dict[str, Any]] = []

        for (entity_id, metric), signals in groups.items():
            values = [s.value for s in signals]

            # Baseline = rolling mean of all-but-last observation
            baseline_vals = values[:-1] if len(values) > 1 else values
            baseline = statistics.mean(baseline_vals)
            std      = statistics.stdev(baseline_vals) if len(baseline_vals) > 1 else 0.0
            current  = values[-1]
            sigma    = _zscore(current, baseline, std)
            vol      = _volatility(values)

            # Accumulate volatility by entity (max over metrics)
            volatility_map[entity_id] = max(
                volatility_map.get(entity_id, 0.0), vol
            )

            # Anomaly detection
            threshold = settings.alert_anomaly_threshold
            if abs(sigma) >= threshold:
                anomaly: dict[str, Any] = {
                    "entity_id":      entity_id,
                    "metric":         metric,
                    "sigma":          round(sigma, 3),
                    "current_value":  current,
                    "baseline_value": round(baseline, 4),
                    "severity":       "critical" if abs(sigma) >= 3.0 else "warning",
                }
                anomalies.append(anomaly)
                log.warning(
                    "anomaly_detected",
                    entity_id=entity_id,
                    metric=metric,
                    sigma=sigma,
                )

                # Emit domain event → Motor Mode / alerting webhook
                await bus.publish(AnomalyDetected(
                    signal_id=f"{entity_id}:{metric}",
                    entity_id=entity_id,
                    metric=metric,
                    sigma=round(sigma, 3),
                    current_value=current,
                    baseline_value=round(baseline, 4),
                ))

                # If capital action required: queue HITL
                if abs(sigma) >= 3.0 and settings.enable_hitl_enforcement:
                    await bus.publish(HITLActionQueued(
                        action_id=f"hitl:{entity_id}:{metric}",
                        action_type="anomaly_response",
                        payload=anomaly,
                    ))

            # Build series summary for LLM forecast
            series_for_llm.append({
                "entity_id":    entity_id,
                "metric":       metric,
                "values":       [round(v, 4) for v in values[-20:]],  # last 20 obs
                "current":      current,
                "baseline":     round(baseline, 4),
                "forecast_7d":  round(_linear_forecast(values, 7), 4),
                "forecast_30d": round(_linear_forecast(values, 30), 4),
                "volatility":   round(vol, 4),
            })

        # ── Persist anomalies to Pinecone for trend history ───────────────────
        if anomalies:
            try:
                await self._pc.upsert_batch(
                    [
                        {
                            "id":   f"anomaly:{a['entity_id']}:{a['metric']}",
                            "text": (
                                f"Anomaly: {a['metric']} for entity {a['entity_id']} "
                                f"sigma={a['sigma']} severity={a['severity']}"
                            ),
                            "metadata": a,
                        }
                        for a in anomalies
                    ],
                    namespace=NS_TRENDS,
                )
            except Exception as exc:
                log.warning("pinecone_trend_upsert_failed", error=str(exc))

        # ── LLM forecast interpretation ───────────────────────────────────────
        forecasts: list[dict[str, Any]] = []
        if series_for_llm:
            try:
                response = await self._groq.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": _FORECAST_SYSTEM},
                        {"role": "user",   "content": json.dumps(
                            {"series": series_for_llm[:15]},   # token budget guard
                            indent=2
                        )},
                    ],
                    temperature=0.1,
                    max_tokens=3072,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content or "{}"
                forecasts = json.loads(raw).get("forecasts", [])
            except Exception as exc:
                log.error("forecast_llm_error", error=str(exc))

        log.info(
            "agent_complete",
            anomalies=len(anomalies),
            forecasts=len(forecasts),
            volatility_entities=len(volatility_map),
        )

        return {
            **state,
            "messages": [
                *state.get("messages", []),
                AIMessage(
                    content=f"[PredictiveSignal] {len(anomalies)} anomalies, "
                            f"{len(forecasts)} forecasts generated."
                ),
            ],
            "ps_forecasts":      forecasts,
            "ps_anomalies":      anomalies,
            "ps_volatility_map": volatility_map,
            "completed_agents":  [
                *state.get("completed_agents", []), "predictive_signal"
            ],
        }
