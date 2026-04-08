"""
StrategyEngine — 7-step pipeline orchestrator.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import google.generativeai as genai
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from .cache_manager import CacheManager, make_cache_key
from .fallback_strategies import get_fallback
from .intent_classifier import BusinessContext, IntentClassifier
from .metrics_engine import MetricsEngine
from .output_validator import OutputValidator

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-1.5-flash"


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
You are a sharp, data-driven business strategy advisor. The user paid for this. Deliver maximum value.

CRITICAL RULES:
1. NEVER use placeholder text like [metric unavailable] or [insert number].
   If a metric is missing, estimate using realistic industry benchmarks and label it "(est.)".
2. Reference the user's EXACT numbers from BUSINESS CONTEXT — follower count, revenue, price, clients.
3. Every sentence must be specific to this user's challenge. No generic advice.
4. Never say "improve your marketing", "build an audience", or similar vague phrases.

Return ONLY a raw JSON object. No markdown. No backticks. Start with {{ end with }}.
Exactly these keys:

  headline     — One specific metric-driven outcome (max 12 words, include a number)
  title        — Bold 5-8 word strategy title tied to their exact situation
  keySignal    — 1-2 sentences citing their specific numbers and why this strategy is the right move now
  tactics      — array of exactly 3 objects, each with:
                   step (integer 1-3)
                   action (concrete task — what to do, not what to consider)
                   timeframe ("X days")
                   expectedResult (quantified outcome using numbers from METRICS DICT or labeled "(est.)")
  benchmarks   — object with:
                   category (detected industry e.g. "Fitness / Personal Training")
                   metrics (array of objects: label, value, source)
                   where source is "user-provided" or "industry-est."
  30dayTarget  — specific revenue or growth number achievable in 30 days given their context
  risk         — one sentence: the single most likely mistake that will kill traction

METRICS DICT (use these numbers verbatim — do NOT invent figures outside this dict):
{metrics_json}

BUSINESS CONTEXT:
{context_json}
"""


class StrategyEngine:
    def __init__(self, gemini_api_key: str):
        genai.configure(api_key=gemini_api_key)
        self._model = genai.GenerativeModel(GEMINI_MODEL)

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
                        "type":           "complete",
                        "result":         result.strategy,
                        "metrics":        result.metrics,
                        "confidence":     result.confidence,
                        "intent":         result.intent,
                        "pipeline_steps": result.pipeline_steps,
                        "cache_hit":      True,
                        "progress":       100,
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
                    "type":           "complete",
                    "result":         result.strategy,
                    "metrics":        result.metrics,
                    "confidence":     result.confidence,
                    "intent":         result.intent,
                    "pipeline_steps": result.pipeline_steps,
                    "cache_hit":      False,
                    "progress":       100,
                }
            )

        except RateLimitError as e:
            yield _sse({"type": "error", "message": str(e), "code": "RATE_LIMIT"})
        except Exception as e:
            logger.exception("Stream pipeline error", extra={"user_id": user_id})
            yield _sse({"type": "error", "message": "Analysis failed. Please try again.", "code": "INTERNAL"})

    # ── Private helpers ───────────────────────────────────────────────

    # Lua sliding-window rate limiter — atomic, race-condition-free.
    # Uses a sorted set (score = timestamp) to track requests in the last hour.
    _RATE_LIMIT_LUA = """
local key    = KEYS[1]
local limit  = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now    = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
    return {0, count}
end
redis.call('ZADD', key, now, now .. ':' .. math.random(1e9))
redis.call('EXPIRE', key, window)
return {1, count + 1}
"""

    async def _check_rate_limit(self, user_id: str, redis: Redis) -> None:
        import time as _time

        now    = int(_time.time())
        key    = f"rate_limit:sliding:{user_id}"
        result = await redis.eval(
            self._RATE_LIMIT_LUA, 1, key, 10, 3600, now
        )
        if not result[0]:
            raise RateLimitError("Rate limit exceeded: 10 analyses per hour.")

    async def _call_claude_with_fallback(
        self,
        ctx: BusinessContext,
        metrics: dict,
        steps: list,
    ) -> dict:
        try:
            result = await self._call_gemini(ctx, metrics)
            steps.append({"step": "llm_generation", "model": GEMINI_MODEL, "status": "success"})
            return result
        except Exception as e:
            logger.warning("Gemini API failed, using fallback", extra={"error": str(e)})
            steps.append(
                {"step": "llm_generation", "model": "fallback", "status": "fallback", "error": str(e)}
            )
            return get_fallback(ctx.business_type)

    async def _call_gemini(self, ctx: BusinessContext, metrics: dict) -> dict:
        import asyncio

        prompt = SYSTEM_PROMPT.format(
            metrics_json=json.dumps(metrics, indent=2),
            context_json=json.dumps(ctx.model_dump(exclude={"raw_question"}), indent=2),
        ) + f"\n\nUSER QUESTION:\n{ctx.raw_question}"

        # Gemini SDK is sync — run in thread pool to avoid blocking event loop
        response = await asyncio.to_thread(
            self._model.generate_content,
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=1200,
                temperature=0.4,
            ),
        )
        raw_text = response.text.strip()

        # Strip markdown fences if model wraps output
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Gemini returned invalid JSON: {e}") from e

    def _score_confidence(self, ctx: BusinessContext, violations: list) -> float:
        score = ctx.confidence_score
        score -= len(violations) * 0.07
        return round(max(0.30, min(0.98, score)), 3)


class RateLimitError(Exception):
    pass
