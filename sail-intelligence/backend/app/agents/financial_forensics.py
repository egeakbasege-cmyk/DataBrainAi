"""
app/agents/financial_forensics.py

Financial Forensics Agent

Responsibilities:
  1. Simulate P&L margins by correlating competitor retail prices (Amazon/eBay)
     with sourcing costs from Alibaba connector data.
  2. Surface real-time arbitrage opportunities (retail − sourcing − logistics).
  3. Output structured P&L dicts ready for the dashboard Metrics Panel.

LLM role:
  - Interprets noisy price data, infers missing fields (e.g. logistics %).
  - Formats the final narrative explanation for each opportunity.
  - Model: llama-3.3-70b via Groq (fast) with OpenAI GPT-4o fallback.

Node output keys: ff_pl_simulations, ff_arbitrage_ops, ff_sourcing_data
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from groq import AsyncGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.state import AgentState
from app.config import get_settings
from app.core.exceptions import AgentError
from app.ontology.models import PriceType

logger   = structlog.get_logger(__name__)
settings = get_settings()

_SYSTEM_PROMPT = """You are a Financial Forensics analyst for a market intelligence platform.
You receive structured price data (retail prices, sourcing costs, logistics estimates) and must:

1. Simulate a P&L margin for each product/entity.
2. Flag arbitrage opportunities where (retail_price - sourcing_cost - logistics) / retail_price > 0.20.
3. Return ONLY valid JSON — no prose, no markdown fences.

Output schema:
{
  "pl_simulations": [
    {
      "entity_id": "string",
      "product_name": "string",
      "retail_price_usd": float,
      "sourcing_cost_usd": float,
      "logistics_est_usd": float,
      "gross_margin_pct": float,
      "net_margin_pct": float,
      "margin_tier": "high|medium|low|negative",
      "notes": "string"
    }
  ],
  "arbitrage_opportunities": [
    {
      "entity_id": "string",
      "product_name": "string",
      "opportunity_score": float,
      "estimated_profit_usd": float,
      "risk_level": "low|medium|high",
      "rationale": "string"
    }
  ]
}

Rules:
- If logistics cost is unknown, estimate at 15% of retail price.
- margin_tier: high > 40%, medium 20-40%, low 5-20%, negative < 5%.
- opportunity_score: (gross_margin_pct / 100) * (1 - risk_adjustment).
- Never fabricate prices. If data is insufficient, omit that entity.
"""


class FinancialForensicsAgent:
    """
    LangGraph node — Financial Forensics.
    Called as: state = await agent.run(state)
    """

    def __init__(self) -> None:
        self._groq = AsyncGroq(api_key=settings.groq_api_key)

    async def run(self, state: AgentState) -> AgentState:
        log = logger.bind(agent="financial_forensics", job_id=state.get("job_id"))
        log.info("agent_start")

        price_points = state.get("price_points", [])
        entities     = state.get("entities", [])

        if not price_points:
            log.warning("no_price_points_skipping")
            return {
                **state,
                "ff_pl_simulations": [],
                "ff_arbitrage_ops":  [],
                "ff_sourcing_data":  [],
                "completed_agents":  [*state.get("completed_agents", []), "financial_forensics"],
            }

        # ── Build entity price lookup ─────────────────────────────────────────
        retail_by_entity:  dict[str, list[PricePoint]] = {}
        sourcing_by_entity: dict[str, list[PricePoint]] = {}

        for pp in price_points:
            if pp.price_type in (PriceType.PRODUCT, PriceType.UNKNOWN):
                retail_by_entity.setdefault(pp.entity_id, []).append(pp)
            if pp.price_type == PriceType.ARBITRAGE:
                sourcing_by_entity.setdefault(pp.entity_id, []).append(pp)

        entity_map = {e.id: e for e in entities}

        # ── Construct LLM payload ─────────────────────────────────────────────
        price_data = []
        for entity_id, retail_pps in retail_by_entity.items():
            entity = entity_map.get(entity_id)
            sourcing = sourcing_by_entity.get(entity_id, [])

            price_data.append({
                "entity_id":          entity_id,
                "entity_name":        entity.name if entity else entity_id,
                "platform":           entity.platform if entity else "unknown",
                "retail_prices_usd":  [
                    {"amount": pp.amount_usd or pp.amount, "product": pp.product_name}
                    for pp in retail_pps
                ],
                "sourcing_costs_usd": [
                    {"amount": pp.amount_usd or pp.amount, "product": pp.product_name}
                    for pp in sourcing
                ],
            })

        user_content = json.dumps({"price_data": price_data}, indent=2)

        try:
            response = await self._groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system",  "content": _SYSTEM_PROMPT},
                    {"role": "user",    "content": user_content},
                ],
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            raw_json = response.choices[0].message.content or "{}"
            result   = json.loads(raw_json)

        except json.JSONDecodeError as exc:
            log.error("ff_json_parse_error", error=str(exc))
            result = {"pl_simulations": [], "arbitrage_opportunities": []}

        except Exception as exc:
            log.error("ff_llm_error", error=str(exc))
            error_entry = {
                "agent":   "financial_forensics",
                "error":   str(exc),
                "skipped": True,
            }
            return {
                **state,
                "ff_pl_simulations": [],
                "ff_arbitrage_ops":  [],
                "ff_sourcing_data":  [],
                "errors": [*state.get("errors", []), error_entry],
                "completed_agents": [
                    *state.get("completed_agents", []), "financial_forensics"
                ],
            }

        pl_sims    = result.get("pl_simulations", [])
        arb_ops    = result.get("arbitrage_opportunities", [])

        log.info(
            "agent_complete",
            pl_simulations=len(pl_sims),
            arbitrage_ops=len(arb_ops),
        )

        return {
            **state,
            "messages": [
                *state.get("messages", []),
                AIMessage(
                    content=f"[FinancialForensics] {len(pl_sims)} P&L simulations, "
                            f"{len(arb_ops)} arbitrage opportunities."
                ),
            ],
            "ff_pl_simulations": pl_sims,
            "ff_arbitrage_ops":  arb_ops,
            "ff_sourcing_data":  price_data,
            "completed_agents":  [
                *state.get("completed_agents", []), "financial_forensics"
            ],
        }
