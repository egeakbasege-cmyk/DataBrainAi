"""
app/agents/state.py

Shared AgentState — the single mutable object that flows through
every node in the LangGraph StateGraph.

Design:
  - TypedDict so LangGraph can deep-merge partial updates from each node.
  - Every agent reads from state and writes only its own output keys.
  - `errors` accumulates failures from any node — the graph continues
    unless a node explicitly sets `abort = True`.
  - `messages` holds the full LangChain message history for the LLM context.
"""

from __future__ import annotations

from typing import Annotated, Any
from typing_extensions import TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.ontology.models import (
    MarketEntity,
    PricePoint,
    AdAsset,
    TrendSignal,
    EntityLink,
)


class AgentState(TypedDict, total=False):
    """
    Shared state passed between all LangGraph nodes.

    Keys prefixed by the agent that owns them:
      (none)      — input / orchestration fields
      ff_*        — Financial Forensics Agent outputs
      er_*        — Entity Resolution Agent outputs
      ps_*        — Predictive Signal Agent outputs
      nlp_*       — NLP Psychographic Agent outputs
    """

    # ── Inputs (set by caller before graph.invoke()) ─────────────────────────
    job_id:          str                    # UUID for this agent run
    query:           str                    # user / system query driving the run
    entities:        list[MarketEntity]     # normalised entities from connectors
    price_points:    list[PricePoint]       # price observations for entities
    ad_assets:       list[AdAsset]          # ad creatives for psychographic analysis
    trend_signals:   list[TrendSignal]      # time-series observations

    # ── LangChain message history (accumulated across nodes) ─────────────────
    messages: Annotated[list[BaseMessage], add_messages]

    # ── Financial Forensics Agent ─────────────────────────────────────────────
    ff_pl_simulations:  list[dict[str, Any]]   # P&L margin simulations per entity
    ff_arbitrage_ops:   list[dict[str, Any]]   # arbitrage opportunities
    ff_sourcing_data:   list[dict[str, Any]]   # Alibaba sourcing cost breakdown

    # ── Entity Resolution Agent ───────────────────────────────────────────────
    er_links:           list[EntityLink]        # resolved cross-platform identity edges
    er_canonical_map:   dict[str, str]          # entity_id → canonical_id mapping

    # ── Predictive Signal Agent ───────────────────────────────────────────────
    ps_forecasts:       list[dict[str, Any]]    # price / inventory forecasts
    ps_anomalies:       list[dict[str, Any]]    # detected anomalies (σ > threshold)
    ps_volatility_map:  dict[str, float]        # entity_id → volatility score

    # ── NLP Psychographic Agent ───────────────────────────────────────────────
    nlp_archetypes:     list[dict[str, Any]]    # per-ad audience archetype analysis
    nlp_unmet_needs:    list[str]               # market gap opportunities
    nlp_copy_angles:    list[dict[str, Any]]    # recommended ad copy angles

    # ── Orchestration ─────────────────────────────────────────────────────────
    errors:             list[dict[str, Any]]    # accumulated non-fatal errors
    abort:              bool                    # set True to stop graph execution
    completed_agents:   list[str]               # names of agents that finished OK
