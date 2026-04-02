"""
StrategyEngine — 7-step pipeline orchestrator.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import anthropic
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from .cache_manager import CacheManager, make_cache_key
from .fallback_strategies import get_fallback
from .intent_classifier import BusinessContext, IntentClassifier
from .metrics_engine import MetricsEngine
from .output_validator import OutputValidator

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-20250514"


@dataclass
class StrategyResult:
    strategy: dict[str, Any]
    metrics: dict[str, Any]
    confidence: float
    intent: str
    pipeline_steps: list[dict[str, Any]]
    cache_hit: bool = False

    def to_dict(self) -> dict:
        return {
            "strategy": self.strategy,
            "metrics": self.metrics,
            "confidence": self.confidence,
            "intent": self.intent,
            "pipeline_steps": self.pipeline_steps,
            "cache_hit": self.cache_hit,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "StrategyResult":
        return cls(**d)


SYSTEM_PROMPT = """\
You are a senior business strategist. The user paid for this analysis. Deliver maximum value.

CRITICAL: All revenue figures, percentages, and KPIs are provided in the METRICS DICT below.
You MUST use those numbers verbatim. Do NOT invent any number.
If a metric is not in the dict, say "data not available" instead of guessing.

Return ONLY a raw JSON object. No markdown. No backticks. Start with {{ end with }}.
Exactly these keys:
  headline   (max 10 words — specific to their situation),
  signal     (2 sentences — the single most leverageable insight, cite specific numbers from metrics dict),
  actions    (array of exactly 3 objects: {{title, what, metric_impact}}
               — metric_impact must reference a key from metrics dict),
  thisWeek   (one sentence — highest-leverage action this week, include expected output in numbers from metrics dict),
  risk       (one sentence — the mistake that will kill traction),
  upside     (use the upside_label value from metrics dict verbatim).

Be brutally specific. Use their industry. Never say "improve your marketing" or "build an audience".

METRICS DICT:
{metrics_json}

BUSINESS CONTEXT:
{context_json}
"""


class StrategyEngine:
    def __init__(self, anthropic_api_key: str):
        self._anthropic_key = anthropic_api_key

    # ── Public API ────────────────────────────────────────────────────

    async def run_pipeline(
        self,
        user_input: str,
        user_id: str,
        db: AsyncSession,
        redis: Redis,
    ) -> StrategyResult:
        steps: list[dict] = []
        t0 = time.monotonic()

        # STEP 1: Rate limit
        await self._check_rate_limit(user_id, redis)
        steps.append({"step": "rate_limit", "status": "pass"})

        # STEP 2: Cache lookup
        cache = CacheManager(redis)
        cached = await cache.get(user_input)
        if cached:
            result = StrategyResult.from_dict(cached)
            result.cache_hit = True
            return result
        steps.append({"step": "cache_lookup", "status": "miss"})

        # STEP 3: IntentClassifier
        ctx = IntentClassifier().classify(user_input)
        steps.append(
            {
                "step": "intent_classification",
                "intent": ctx.intent_category,
                "business_type": ctx.business_type,
                "confidence": ctx.confidence_score,
            }
        )

        # STEP 4: MetricsEngine
        metrics = MetricsEngine().compute(ctx)
        steps.append({"step": "metrics_computed", "keys_produced": list(metrics.keys())})

        # STEP 5: Claude generation (with fallback)
        strategy_raw = await self._call_claude_with_fallback(ctx, metrics, steps)

        # STEP 6: OutputValidator
        strategy_clean, violations = OutputValidator().validate(strategy_raw, metrics)
        steps.append(
            {
                "step": "output_validation",
                "violations_caught": len(violations),
                "violations": violations,
            }
        )

        # STEP 7: Confidence + cache write
        final_confidence = self._score_confidence(ctx, violations)
        result = StrategyResult(
            strategy=strategy_clean,
            metrics=metrics,
            confidence=final_confidence,
            intent=ctx.intent_category,
            pipeline_steps=steps,
            cache_hit=False,
        )
        await cache.set(user_input, result.to_dict())
        steps.append({"step": "cache_written", "ttl": 3600})

        duration_ms = round((time.monotonic() - t0) * 1000)
        logger.info(
            "Pipeline complete",
            extra={
                "user_id": user_id,
                "business_type": ctx.business_type,
                "duration_ms": duration_ms,
                "violations": len(violations),
                "confidence": final_confidence,
            },
        )
        return result

    async def stream_pipeline(
        self,
        user_input: str,
        user_id: str,
        db: AsyncSession,
        redis: Redis,
    ) -> AsyncIterator[str]:
        """Yield SSE-formatted strings for the streaming endpoint."""

        def _sse(data: dict) -> str:
            return f"data: {json.dumps(data)}\n\n"

        steps: list[dict] = []

        try:
            # Step 1
            await self._check_rate_limit(user_id, redis)
            steps.append({"step": "rate_limit", "status": "pass"})
            yield _sse({"type": "step", "step": "rate_limit", "progress": 7})

            # Step 2
            cache = CacheManager(redis)
            cached = await cache.get(user_input)
            if cached:
                result = StrategyResult.from_dict(cached)
                result.cache_hit = True
                yield _sse(
                    {
                        "type": "complete",
                        "result": result.strategy,
                        "metrics": result.metrics,
                        "confidence": result.confidence,
                        "pipeline_steps": result.pipeline_steps,
                        "cache_hit": True,
                        "progress": 100,
                    }
                )
                return
            steps.append({"step": "cache_lookup", "status": "miss"})
            yield _sse({"type": "step", "step": "cache_lookup", "progress": 14})

            # Step 3
            ctx = IntentClassifier().classify(user_input)
            steps.append(
                {
                    "step": "intent_classification",
                    "intent": ctx.intent_category,
                    "business_type": ctx.business_type,
                    "confidence": ctx.confidence_score,
                }
            )
            yield _sse(
                {
                    "type": "step",
                    "step": "intent_classification",
                    "progress": 28,
                    "business_type": ctx.business_type,
                }
            )

            # Step 4
            metrics = MetricsEngine().compute(ctx)
            steps.append({"step": "metrics_computed", "keys_produced": list(metrics.keys())})
            yield _sse({"type": "step", "step": "metrics_computed", "progress": 42})

            # Step 5
            strategy_raw = await self._call_claude_with_fallback(ctx, metrics, steps)
            yield _sse({"type": "step", "step": "llm_generation", "progress": 70})

            # Step 6
            strategy_clean, violations = OutputValidator().validate(strategy_raw, metrics)
            steps.append(
                {
                    "step": "output_validation",
                    "violations_caught": len(violations),
                    "violations": violations,
                }
            )
            yield _sse({"type": "step", "step": "output_validation", "progress": 84})

            # Step 7
            final_confidence = self._score_confidence(ctx, violations)
            result = StrategyResult(
                strategy=strategy_clean,
                metrics=metrics,
                confidence=final_confidence,
                intent=ctx.intent_category,
                pipeline_steps=steps,
            )
            await cache.set(user_input, result.to_dict())
            steps.append({"step": "cache_written", "ttl": 3600})

            yield _sse(
                {
                    "type": "complete",
                    "result": result.strategy,
                    "metrics": result.metrics,
                    "confidence": result.confidence,
                    "pipeline_steps": result.pipeline_steps,
                    "cache_hit": False,
                    "progress": 100,
                }
            )

        except RateLimitError as e:
            yield _sse({"type": "error", "message": str(e), "code": "RATE_LIMIT"})
        except Exception as e:
            logger.exception("Stream pipeline error", extra={"user_id": user_id})
            yield _sse({"type": "error", "message": "Analysis failed. Please try again.", "code": "INTERNAL"})

    # ── Private helpers ───────────────────────────────────────────────

    async def _check_rate_limit(self, user_id: str, redis: Redis) -> None:
        import time as _time

        bucket = f"rate_limit:{user_id}:{int(_time.time()) // 3600}"
        count = await redis.incr(bucket)
        if count == 1:
            await redis.expire(bucket, 3600)
        if count > 10:
            raise RateLimitError("Rate limit exceeded: 10 analyses per hour.")

    async def _call_claude_with_fallback(
        self,
        ctx: BusinessContext,
        metrics: dict,
        steps: list,
    ) -> dict:
        try:
            result = await self._call_claude(ctx, metrics)
            steps.append({"step": "llm_generation", "model": CLAUDE_MODEL, "status": "success"})
            return result
        except Exception as e:
            logger.warning("Claude API failed, using fallback", extra={"error": str(e)})
            steps.append(
                {"step": "llm_generation", "model": "fallback", "status": "fallback", "error": str(e)}
            )
            return get_fallback(ctx.business_type)

    async def _call_claude(self, ctx: BusinessContext, metrics: dict) -> dict:
        import asyncio

        client = anthropic.Anthropic(api_key=self._anthropic_key)

        system = SYSTEM_PROMPT.format(
            metrics_json=json.dumps(metrics, indent=2),
            context_json=json.dumps(ctx.model_dump(exclude={"raw_question"}), indent=2),
        )

        def _sync_call() -> str:
            response = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1200,
                system=system,
                messages=[{"role": "user", "content": ctx.raw_question}],
            )
            return response.content[0].text

        raw_text = await asyncio.to_thread(_sync_call)

        # Strip markdown fences if Claude wraps output
        text = raw_text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Claude returned invalid JSON: {e}") from e

    def _score_confidence(self, ctx: BusinessContext, violations: list) -> float:
        score = ctx.confidence_score
        score -= len(violations) * 0.07
        return round(max(0.30, min(0.98, score)), 3)


class RateLimitError(Exception):
    pass
