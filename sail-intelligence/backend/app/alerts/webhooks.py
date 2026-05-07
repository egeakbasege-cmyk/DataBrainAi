"""
app/alerts/webhooks.py

Telegram and WhatsApp webhook dispatcher.

Rules (spec requirement):
  - Alerts fire ONLY on statistically significant anomalies (σ ≥ threshold).
  - NOT on every data event — the AnomalyDetected handler checks severity.
  - Critical anomalies (σ ≥ 3.0) → Telegram + WhatsApp.
  - Warning anomalies (threshold ≤ σ < 3.0) → Telegram only.

Wiring:
  The module registers itself as an EventBus subscriber at import time.
  Import this module once from main.py lifespan to activate the handlers.

  from app.alerts import webhooks  # noqa: F401 — side-effect import
"""

from __future__ import annotations

import structlog
import httpx

from app.config import get_settings
from app.core.events import bus, AnomalyDetected

logger   = structlog.get_logger(__name__)
settings = get_settings()

_TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


# ── Formatters ────────────────────────────────────────────────────────────────

def _format_telegram(event: AnomalyDetected) -> str:
    severity_emoji = "🔴" if abs(event.sigma) >= 3.0 else "🟡"
    direction      = "▲" if event.sigma > 0 else "▼"
    return (
        f"{severity_emoji} *SAIL INTELLIGENCE ALERT*\n"
        f"Entity:  `{event.entity_id}`\n"
        f"Metric:  `{event.metric}`\n"
        f"Value:   `{event.current_value:.4f}` {direction} (baseline `{event.baseline_value:.4f}`)\n"
        f"Sigma:   `{event.sigma:.2f}σ`\n"
        f"Signal:  `{event.signal_id}`\n"
        f"At:      `{event.occurred_at}`"
    )


def _format_whatsapp(event: AnomalyDetected) -> str:
    direction = "UP" if event.sigma > 0 else "DOWN"
    return (
        f"SAIL ALERT: {event.metric} for {event.entity_id} moved {direction} "
        f"{abs(event.sigma):.1f}σ. "
        f"Current: {event.current_value:.4f}, Baseline: {event.baseline_value:.4f}. "
        f"Signal ID: {event.signal_id}"
    )


# ── Dispatch helpers ──────────────────────────────────────────────────────────

async def _send_telegram(text: str) -> None:
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.debug("telegram_not_configured_skipping")
        return
    url = _TELEGRAM_API.format(token=settings.telegram_bot_token)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json={
                    "chat_id":    settings.telegram_chat_id,
                    "text":       text,
                    "parse_mode": "Markdown",
                },
            )
            if not resp.is_success:
                logger.warning("telegram_send_failed", status=resp.status_code)
            else:
                logger.info("telegram_alert_sent")
    except Exception as exc:
        logger.error("telegram_error", error=str(exc))


async def _send_whatsapp(text: str) -> None:
    if not settings.whatsapp_webhook_url:
        logger.debug("whatsapp_not_configured_skipping")
        return
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                settings.whatsapp_webhook_url,
                json={"message": text},
            )
            if not resp.is_success:
                logger.warning("whatsapp_send_failed", status=resp.status_code)
            else:
                logger.info("whatsapp_alert_sent")
    except Exception as exc:
        logger.error("whatsapp_error", error=str(exc))


# ── EventBus subscriber ───────────────────────────────────────────────────────

@bus.subscribe(AnomalyDetected)
async def on_anomaly_detected(event: AnomalyDetected) -> None:
    """
    Fires when PredictiveSignalAgent publishes an AnomalyDetected event.
    Only dispatches when sigma meets the configured threshold.
    """
    threshold = settings.alert_anomaly_threshold
    if abs(event.sigma) < threshold:
        return   # below threshold — no alert

    telegram_text  = _format_telegram(event)
    whatsapp_text  = _format_whatsapp(event)

    # Always send Telegram
    await _send_telegram(telegram_text)

    # WhatsApp only for critical alerts (σ ≥ 3.0)
    if abs(event.sigma) >= 3.0:
        await _send_whatsapp(whatsapp_text)
