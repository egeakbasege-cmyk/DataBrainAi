"""
app/agents/nlp_psychographic.py

NLP Psychographic Agent

Responsibilities:
  1. Analyse competitor ad copy (AdAsset.body_copy + AdAsset.headline) to infer:
       - Targeted psychological archetype of the competitor's audience
       - Emotional triggers being leveraged
       - Sentiment polarity
  2. Surface unmet needs by finding topics/pain-points absent from all analysed ads.
  3. Generate ad copy angles that address the identified gaps.

Psychographic archetypes used (simplified Jungian):
  Explorer, Rebel, Hero, Caregiver, Creator, Ruler, Sage, Innocent,
  Everyman, Jester, Lover, Magician

Output:
  - nlp_archetypes   : per-asset audience analysis
  - nlp_unmet_needs  : list of market gap strings
  - nlp_copy_angles  : recommended copy angles with rationale

Node output keys: nlp_archetypes, nlp_unmet_needs, nlp_copy_angles
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from groq import AsyncGroq
from langchain_core.messages import AIMessage

from app.agents.state import AgentState
from app.config import get_settings
from app.ontology.models import AdAsset

logger   = structlog.get_logger(__name__)
settings = get_settings()

_ARCHETYPES = [
    "Explorer", "Rebel", "Hero", "Caregiver", "Creator", "Ruler",
    "Sage", "Innocent", "Everyman", "Jester", "Lover", "Magician",
]

_PSYCHOGRAPHIC_SYSTEM = f"""You are an expert NLP and psychographic analyst for a competitive intelligence platform.

You receive a list of competitor ad creatives and must output a structured JSON analysis.

Available archetypes: {', '.join(_ARCHETYPES)}

Output ONLY valid JSON, no markdown fences:
{{
  "asset_analyses": [
    {{
      "asset_id": "string",
      "archetype": "one of the archetypes above",
      "confidence": float (0.0-1.0),
      "emotional_triggers": ["list", "of", "triggers"],
      "sentiment": float (-1.0 negative to 1.0 positive),
      "pain_points_addressed": ["list"],
      "desires_activated": ["list"],
      "copy_angle_used": "string — e.g. fear_of_missing_out, social_proof, authority"
    }}
  ],
  "unmet_needs": [
    "string — a gap no competitor ad addresses"
  ],
  "recommended_copy_angles": [
    {{
      "angle": "string",
      "archetype_target": "string",
      "sample_headline": "string (max 10 words)",
      "rationale": "string (max 30 words)"
    }}
  ]
}}

Rules:
- Base ALL analysis strictly on the provided ad copy text. Do not invent details.
- Unmet needs must be logically derived from what is ABSENT across all ads.
- Recommended angles must directly address an identified unmet need.
- Return between 1 and 5 recommended_copy_angles.
"""


class NLPPsychographicAgent:
    """
    LangGraph node — NLP Psychographic.
    Deep copy analysis without hallucination: only what's in the ad text.
    """

    def __init__(self) -> None:
        self._groq = AsyncGroq(api_key=settings.groq_api_key)

    async def run(self, state: AgentState) -> AgentState:
        log = logger.bind(agent="nlp_psychographic", job_id=state.get("job_id"))
        log.info("agent_start")

        ad_assets: list[AdAsset] = state.get("ad_assets", [])

        if not ad_assets:
            log.warning("no_ad_assets_skipping")
            return {
                **state,
                "nlp_archetypes":  [],
                "nlp_unmet_needs": [],
                "nlp_copy_angles": [],
                "completed_agents": [
                    *state.get("completed_agents", []), "nlp_psychographic"
                ],
            }

        # ── Prepare ad copy payload for LLM ──────────────────────────────────
        # Trim to 300 chars each — avoids blowing token budget on verbose creatives
        ad_payloads = [
            {
                "asset_id":   asset.id,
                "platform":   str(asset.platform),
                "headline":   (asset.headline or "")[:200],
                "body_copy":  (asset.body_copy or "")[:300],
                "cta":        asset.call_to_action or "",
                "media_type": asset.media_type or "",
            }
            for asset in ad_assets[:30]   # cap at 30 assets per run (token budget)
        ]

        try:
            response = await self._groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": _PSYCHOGRAPHIC_SYSTEM},
                    {"role": "user",   "content": json.dumps(
                        {"ads": ad_payloads}, indent=2
                    )},
                ],
                temperature=0.2,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            raw    = response.choices[0].message.content or "{}"
            result = json.loads(raw)

        except json.JSONDecodeError as exc:
            log.error("nlp_json_parse_error", error=str(exc))
            result = {}

        except Exception as exc:
            log.error("nlp_llm_error", error=str(exc))
            return {
                **state,
                "nlp_archetypes":  [],
                "nlp_unmet_needs": [],
                "nlp_copy_angles": [],
                "errors": [
                    *state.get("errors", []),
                    {"agent": "nlp_psychographic", "error": str(exc)},
                ],
                "completed_agents": [
                    *state.get("completed_agents", []), "nlp_psychographic"
                ],
            }

        archetypes  = result.get("asset_analyses", [])
        unmet_needs = result.get("unmet_needs", [])
        copy_angles = result.get("recommended_copy_angles", [])

        # ── Enrich AdAsset objects in-state with psychographic fields ─────────
        asset_map = {a.id: a for a in ad_assets}
        for analysis in archetypes:
            asset = asset_map.get(analysis.get("asset_id", ""))
            if asset:
                asset.target_archetype  = analysis.get("archetype", "")
                asset.emotional_triggers = analysis.get("emotional_triggers", [])
                asset.sentiment         = analysis.get("sentiment")
                asset.unmet_need        = ", ".join(analysis.get("pain_points_addressed", []))

        log.info(
            "agent_complete",
            archetypes_analysed=len(archetypes),
            unmet_needs=len(unmet_needs),
            copy_angles=len(copy_angles),
        )

        return {
            **state,
            "messages": [
                *state.get("messages", []),
                AIMessage(
                    content=(
                        f"[NLPPsychographic] {len(archetypes)} ad archetypes analysed, "
                        f"{len(unmet_needs)} unmet needs, "
                        f"{len(copy_angles)} copy angles."
                    )
                ),
            ],
            "nlp_archetypes":  archetypes,
            "nlp_unmet_needs": unmet_needs,
            "nlp_copy_angles": copy_angles,
            "completed_agents": [
                *state.get("completed_agents", []), "nlp_psychographic"
            ],
        }
