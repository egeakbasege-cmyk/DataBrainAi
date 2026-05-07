"""
app/agents/entity_resolution.py

Entity Resolution Agent

Responsibilities:
  1. Embed every incoming MarketEntity as a text description.
  2. Query Pinecone NS_ENTITIES namespace for similar vectors.
  3. If cosine similarity ≥ threshold → create an EntityLink (cross-platform match).
  4. Assign a canonical_id to each cluster of linked entities.
  5. Upsert new entity vectors to Pinecone for future resolution runs.

Example resolution:
  Amazon seller "TechGadgetsGlobal" + Meta Ads page "Tech Gadgets Global"
  → confidence 0.91 → EntityLink → canonical_id assigned to both

Node output keys: er_links, er_canonical_map
"""

from __future__ import annotations

from uuid import uuid4

import structlog

from app.agents.state import AgentState
from app.core.exceptions import AgentError, VectorDBError
from app.ontology.models import EntityLink, MarketEntity
from app.vector.pinecone_client import PineconeClient, NS_ENTITIES

logger = structlog.get_logger(__name__)

# Cosine similarity threshold for declaring a cross-platform match
_MATCH_THRESHOLD = 0.88
# Max candidates returned per entity query
_TOP_K = 8


def _entity_to_text(entity: MarketEntity) -> str:
    """
    Serialise a MarketEntity to a single descriptive string for embedding.
    Combines name, description, location, and platform for rich signal.
    """
    parts = [
        f"Name: {entity.name}",
        f"Platform: {entity.platform}",
    ]
    if entity.description:
        parts.append(f"Description: {entity.description}")
    if entity.location:
        parts.append(f"Location: {entity.location}")
    if entity.country_code:
        parts.append(f"Country: {entity.country_code}")
    if entity.url:
        parts.append(f"URL: {entity.url}")
    return " | ".join(parts)


def _entity_metadata(entity: MarketEntity) -> dict:
    return {
        "name":             entity.name,
        "platform":         str(entity.platform),
        "entity_type":      str(entity.entity_type),
        "source_connector": entity.source_connector,
        "location":         entity.location,
        "country_code":     entity.country_code,
    }


class EntityResolutionAgent:
    """
    LangGraph node — Entity Resolution.
    Uses vector similarity (Pinecone) to cross-link digital footprints
    across platforms without requiring LLM inference per entity pair.
    """

    def __init__(self, pinecone: PineconeClient) -> None:
        self._pc = pinecone

    async def run(self, state: AgentState) -> AgentState:
        log = logger.bind(agent="entity_resolution", job_id=state.get("job_id"))
        log.info("agent_start")

        entities: list[MarketEntity] = state.get("entities", [])

        if not entities:
            log.warning("no_entities_skipping")
            return {
                **state,
                "er_links":        [],
                "er_canonical_map": {},
                "completed_agents": [
                    *state.get("completed_agents", []), "entity_resolution"
                ],
            }

        # ── Step 1: Upsert all entities into Pinecone ─────────────────────────
        try:
            upsert_records = [
                {
                    "id":       entity.id,
                    "text":     _entity_to_text(entity),
                    "metadata": _entity_metadata(entity),
                }
                for entity in entities
            ]
            await self._pc.upsert_batch(upsert_records, namespace=NS_ENTITIES)
            log.info("entities_upserted", count=len(upsert_records))
        except VectorDBError as exc:
            log.error("upsert_failed", error=exc.message)
            return {
                **state,
                "er_links":        [],
                "er_canonical_map": {},
                "errors": [
                    *state.get("errors", []),
                    {"agent": "entity_resolution", "error": exc.message},
                ],
                "completed_agents": [
                    *state.get("completed_agents", []), "entity_resolution"
                ],
            }

        # ── Step 2: Query for similar entities and build links ────────────────
        links:         list[EntityLink]  = []
        canonical_map: dict[str, str]   = {}
        seen_pairs:    set[frozenset]   = set()

        for entity in entities:
            try:
                candidates = await self._pc.query_by_id(
                    entity_id=entity.id,
                    top_k=_TOP_K,
                    namespace=NS_ENTITIES,
                    # Only match different platforms to avoid self-platform duplicates
                    filter={"platform": {"$ne": str(entity.platform)}},
                )
            except VectorDBError as exc:
                log.warning("query_failed", entity_id=entity.id, error=exc.message)
                continue

            for candidate in candidates:
                score    = candidate["score"]
                cand_id  = candidate["id"]

                if score < _MATCH_THRESHOLD:
                    continue

                pair = frozenset([entity.id, cand_id])
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                # Determine canonical ID (first seen wins)
                canon = canonical_map.get(entity.id) or canonical_map.get(cand_id)
                if not canon:
                    canon = str(uuid4())
                canonical_map[entity.id] = canon
                canonical_map[cand_id]   = canon

                link = EntityLink(
                    source_connector=entity.source_connector,
                    source_entity_id=entity.id,
                    target_entity_id=cand_id,
                    confidence=round(float(score), 4),
                    evidence=[
                        f"cosine_similarity={score:.4f}",
                        f"source_platform={entity.platform}",
                        f"target_platform={candidate['metadata'].get('platform', '?')}",
                    ],
                )
                links.append(link)
                log.debug(
                    "entity_link_created",
                    source=entity.id,
                    target=cand_id,
                    confidence=link.confidence,
                )

        log.info(
            "agent_complete",
            links_found=len(links),
            canonical_clusters=len(set(canonical_map.values())),
        )

        from langchain_core.messages import AIMessage
        return {
            **state,
            "messages": [
                *state.get("messages", []),
                AIMessage(
                    content=f"[EntityResolution] {len(links)} cross-platform links found, "
                            f"{len(set(canonical_map.values()))} canonical clusters."
                ),
            ],
            "er_links":         links,
            "er_canonical_map": canonical_map,
            "completed_agents": [
                *state.get("completed_agents", []), "entity_resolution"
            ],
        }
