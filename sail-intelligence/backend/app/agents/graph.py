"""
app/agents/graph.py

LangGraph StateGraph — Cognitive Engine orchestration.

Topology:
                        ┌───────────────────────────────────┐
                        │           START                   │
                        └──────────────┬────────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────────┐
              │                        │                          │
              ▼                        ▼                          ▼
   financial_forensics      entity_resolution          nlp_psychographic
              │                        │                          │
              └────────────────────────┼──────────────────────────┘
                                       │
                                       ▼
                            predictive_signal
                                       │
                                       ▼
                                    merge
                                       │
                                       ▼
                                     END

Parallelism:
  - financial_forensics, entity_resolution, nlp_psychographic run concurrently
    (LangGraph sends them to the same async event loop turn).
  - predictive_signal runs after the parallel group because it consumes
    er_links for entity-aware anomaly context and can trigger HITL events.
  - merge collects all outputs, computes a final summary, and returns.

Resilience:
  - Each node wraps its agent in a try/except that appends to state["errors"]
    and sets completed_agents — the graph NEVER halts on a single agent failure.
  - abort=True (set inside any node) triggers the abort_check conditional
    edge that jumps directly to END.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

import structlog
from langchain_core.messages import HumanMessage
from langgraph.graph import END, START, StateGraph

from app.agents.state import AgentState
from app.agents.financial_forensics import FinancialForensicsAgent
from app.agents.entity_resolution   import EntityResolutionAgent
from app.agents.predictive_signal   import PredictiveSignalAgent
from app.agents.nlp_psychographic   import NLPPsychographicAgent
from app.vector.pinecone_client     import pinecone_client

logger = structlog.get_logger(__name__)


# ── Node wrappers ─────────────────────────────────────────────────────────────
# Each wrapper instantiates (or reuses) the agent and returns a partial state.
# Exceptions are caught here so the graph continues even if one agent fails.

_ff_agent  = FinancialForensicsAgent()
_er_agent  = EntityResolutionAgent(pinecone=pinecone_client)
_ps_agent  = PredictiveSignalAgent(pinecone=pinecone_client)
_nlp_agent = NLPPsychographicAgent()


async def node_financial_forensics(state: AgentState) -> AgentState:
    try:
        return await _ff_agent.run(state)
    except Exception as exc:
        logger.error("node_ff_unhandled", error=str(exc))
        return {
            **state,
            "ff_pl_simulations": [],
            "ff_arbitrage_ops":  [],
            "ff_sourcing_data":  [],
            "errors": [
                *state.get("errors", []),
                {"agent": "financial_forensics", "error": str(exc), "fatal": False},
            ],
        }


async def node_entity_resolution(state: AgentState) -> AgentState:
    try:
        return await _er_agent.run(state)
    except Exception as exc:
        logger.error("node_er_unhandled", error=str(exc))
        return {
            **state,
            "er_links":        [],
            "er_canonical_map": {},
            "errors": [
                *state.get("errors", []),
                {"agent": "entity_resolution", "error": str(exc), "fatal": False},
            ],
        }


async def node_nlp_psychographic(state: AgentState) -> AgentState:
    try:
        return await _nlp_agent.run(state)
    except Exception as exc:
        logger.error("node_nlp_unhandled", error=str(exc))
        return {
            **state,
            "nlp_archetypes":  [],
            "nlp_unmet_needs": [],
            "nlp_copy_angles": [],
            "errors": [
                *state.get("errors", []),
                {"agent": "nlp_psychographic", "error": str(exc), "fatal": False},
            ],
        }


async def node_predictive_signal(state: AgentState) -> AgentState:
    try:
        return await _ps_agent.run(state)
    except Exception as exc:
        logger.error("node_ps_unhandled", error=str(exc))
        return {
            **state,
            "ps_forecasts":      [],
            "ps_anomalies":      [],
            "ps_volatility_map": {},
            "errors": [
                *state.get("errors", []),
                {"agent": "predictive_signal", "error": str(exc), "fatal": False},
            ],
        }


async def node_merge(state: AgentState) -> AgentState:
    """
    Final aggregation node.
    Computes a top-level summary dict and attaches to state for API serialisation.
    """
    completed = state.get("completed_agents", [])
    errors    = state.get("errors", [])

    summary: dict[str, Any] = {
        "job_id":              state.get("job_id"),
        "completed_agents":    completed,
        "error_count":         len(errors),
        "pl_simulations":      len(state.get("ff_pl_simulations", [])),
        "arbitrage_ops":       len(state.get("ff_arbitrage_ops", [])),
        "entity_links":        len(state.get("er_links", [])),
        "canonical_clusters":  len(set(state.get("er_canonical_map", {}).values())),
        "anomalies":           len(state.get("ps_anomalies", [])),
        "forecasts":           len(state.get("ps_forecasts", [])),
        "archetypes_analysed": len(state.get("nlp_archetypes", [])),
        "unmet_needs":         len(state.get("nlp_unmet_needs", [])),
        "copy_angles":         len(state.get("nlp_copy_angles", [])),
    }

    logger.info("cognitive_engine_complete", **summary)

    return {**state, "__summary": summary}   # type: ignore[typeddict-unknown-key]


# ── Conditional edge — abort check ────────────────────────────────────────────

def should_abort(state: AgentState) -> Literal["predictive_signal", "__end__"]:
    """Skip remaining nodes if a critical failure set abort=True."""
    if state.get("abort"):
        logger.warning("graph_abort_triggered")
        return END
    return "predictive_signal"


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    # Register nodes
    graph.add_node("financial_forensics", node_financial_forensics)
    graph.add_node("entity_resolution",   node_entity_resolution)
    graph.add_node("nlp_psychographic",   node_nlp_psychographic)
    graph.add_node("predictive_signal",   node_predictive_signal)
    graph.add_node("merge",               node_merge)

    # ── Parallel fan-out from START ───────────────────────────────────────────
    graph.add_edge(START, "financial_forensics")
    graph.add_edge(START, "entity_resolution")
    graph.add_edge(START, "nlp_psychographic")

    # ── Fan-in: all three parallel nodes → abort check → predictive_signal ───
    graph.add_conditional_edges(
        "financial_forensics",
        should_abort,
        {"predictive_signal": "predictive_signal", END: END},
    )
    graph.add_conditional_edges(
        "entity_resolution",
        should_abort,
        {"predictive_signal": "predictive_signal", END: END},
    )
    graph.add_conditional_edges(
        "nlp_psychographic",
        should_abort,
        {"predictive_signal": "predictive_signal", END: END},
    )

    # ── predictive_signal → merge → END ──────────────────────────────────────
    graph.add_edge("predictive_signal", "merge")
    graph.add_edge("merge", END)

    return graph


# ── Compiled singleton ────────────────────────────────────────────────────────
_compiled_graph = build_graph().compile()


async def run_cognitive_engine(
    entities:      list = None,
    price_points:  list = None,
    ad_assets:     list = None,
    trend_signals: list = None,
    query:         str  = "",
) -> AgentState:
    """
    Public entry point for the cognitive engine.
    Initialises state and invokes the compiled LangGraph.

    Returns the final AgentState including all agent outputs and __summary.
    """
    initial_state: AgentState = {
        "job_id":          str(uuid4()),
        "query":           query,
        "entities":        entities      or [],
        "price_points":    price_points  or [],
        "ad_assets":       ad_assets     or [],
        "trend_signals":   trend_signals or [],
        "messages":        [HumanMessage(content=query)] if query else [],
        "errors":          [],
        "abort":           False,
        "completed_agents": [],
        # Agent output keys — initialised to safe defaults
        "ff_pl_simulations":  [],
        "ff_arbitrage_ops":   [],
        "ff_sourcing_data":   [],
        "er_links":           [],
        "er_canonical_map":   {},
        "ps_forecasts":       [],
        "ps_anomalies":       [],
        "ps_volatility_map":  {},
        "nlp_archetypes":     [],
        "nlp_unmet_needs":    [],
        "nlp_copy_angles":    [],
    }

    logger.info("cognitive_engine_start", job_id=initial_state["job_id"], query=query)

    final_state: AgentState = await _compiled_graph.ainvoke(initial_state)
    return final_state
