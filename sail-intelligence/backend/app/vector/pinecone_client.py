"""
app/vector/pinecone_client.py

Pinecone vector database client.

Responsibilities:
  - Upsert entity embeddings (Entity Resolution Agent)
  - Query by similarity (entity cross-linking, trend persistence)
  - Namespace routing — each domain gets its own namespace to avoid
    cross-contamination between e-commerce, real-estate, creator vectors

Namespaces:
  "entities"   — MarketEntity embeddings for cross-platform resolution
  "trends"     — TrendSignal time-series embeddings for forecast retrieval
  "reports"    — Executive report embeddings for YACHT mode cache

Embedding model: text-embedding-3-large (3072-dim) via OpenAI
Fallback:        text-embedding-3-small (1536-dim) on quota exhaustion
"""

from __future__ import annotations

import hashlib
from typing import Any

import structlog
from openai import AsyncOpenAI
from pinecone import Pinecone, ServerlessSpec

from app.config import get_settings
from app.core.exceptions import VectorDBError

logger   = structlog.get_logger(__name__)
settings = get_settings()

# ── Namespace constants ───────────────────────────────────────────────────────
NS_ENTITIES = "entities"
NS_TRENDS   = "trends"
NS_REPORTS  = "reports"


class PineconeClient:
    """
    Async-friendly Pinecone client.
    Pinecone's Python SDK v5 is synchronous internally but is called from
    async context via run_in_executor — keeping the FastAPI event loop free.
    """

    def __init__(self) -> None:
        self._pc     = Pinecone(api_key=settings.pinecone_api_key)
        self._index  = self._pc.Index(settings.pinecone_index_name)
        self._openai = AsyncOpenAI(api_key=settings.openai_api_key)
        self._dim    = settings.embedding_dimensions

    # ── Index bootstrap ───────────────────────────────────────────────────────

    def ensure_index(self) -> None:
        """
        Create the Pinecone index if it does not yet exist.
        Called once from orchestrator.bootstrap().
        """
        existing = [i.name for i in self._pc.list_indexes()]
        if settings.pinecone_index_name not in existing:
            self._pc.create_index(
                name=settings.pinecone_index_name,
                dimension=self._dim,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=settings.pinecone_environment,
                ),
            )
            logger.info(
                "pinecone_index_created",
                name=settings.pinecone_index_name,
                dimension=self._dim,
            )

    # ── Embedding ─────────────────────────────────────────────────────────────

    async def embed(self, text: str) -> list[float]:
        """
        Generate a single embedding via OpenAI.
        Falls back to text-embedding-3-small on quota error.
        """
        if not text.strip():
            return [0.0] * self._dim

        try:
            response = await self._openai.embeddings.create(
                model=settings.embedding_model,
                input=text[:8_000],   # hard cap — model context limit
            )
            return response.data[0].embedding
        except Exception as exc:
            if "quota" in str(exc).lower() or "429" in str(exc):
                # Fallback to smaller model
                logger.warning("openai_quota_fallback", error=str(exc))
                response = await self._openai.embeddings.create(
                    model="text-embedding-3-small",
                    input=text[:8_000],
                )
                return response.data[0].embedding
            raise VectorDBError(
                message=f"Embedding failed: {exc}",
                detail={"text_preview": text[:100]},
            ) from exc

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed up to 100 texts in a single OpenAI call."""
        if not texts:
            return []
        cleaned = [t[:8_000] if t.strip() else "" for t in texts]
        try:
            response = await self._openai.embeddings.create(
                model=settings.embedding_model,
                input=cleaned,
            )
            # Response order matches input order
            return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
        except Exception as exc:
            raise VectorDBError(
                message=f"Batch embedding failed: {exc}",
            ) from exc

    # ── Upsert ────────────────────────────────────────────────────────────────

    async def upsert_entity(
        self,
        entity_id:  str,
        text:       str,
        metadata:   dict[str, Any],
        namespace:  str = NS_ENTITIES,
    ) -> None:
        """
        Embed `text` and upsert to Pinecone under `entity_id`.
        metadata is stored alongside the vector for filtered retrieval.
        """
        vector = await self.embed(text)
        try:
            self._index.upsert(
                vectors=[{
                    "id":       entity_id,
                    "values":   vector,
                    "metadata": metadata,
                }],
                namespace=namespace,
            )
            logger.debug(
                "pinecone_upsert",
                entity_id=entity_id,
                namespace=namespace,
            )
        except Exception as exc:
            raise VectorDBError(
                message=f"Pinecone upsert failed: {exc}",
                detail={"entity_id": entity_id},
            ) from exc

    async def upsert_batch(
        self,
        records:   list[dict[str, Any]],   # [{id, text, metadata}]
        namespace: str = NS_ENTITIES,
        batch_size: int = 100,
    ) -> None:
        """
        Batch upsert with automatic chunking (Pinecone max 100 per request).
        """
        if not records:
            return

        texts  = [r["text"] for r in records]
        vectors = await self.embed_batch(texts)

        for i in range(0, len(records), batch_size):
            chunk = records[i : i + batch_size]
            chunk_vecs = vectors[i : i + batch_size]
            payload = [
                {"id": r["id"], "values": v, "metadata": r.get("metadata", {})}
                for r, v in zip(chunk, chunk_vecs)
            ]
            try:
                self._index.upsert(vectors=payload, namespace=namespace)
            except Exception as exc:
                raise VectorDBError(
                    message=f"Pinecone batch upsert failed at chunk {i}: {exc}",
                ) from exc

        logger.info(
            "pinecone_batch_upsert",
            count=len(records),
            namespace=namespace,
        )

    # ── Query ─────────────────────────────────────────────────────────────────

    async def query(
        self,
        text:           str,
        top_k:          int = 10,
        namespace:      str = NS_ENTITIES,
        filter:         dict[str, Any] | None = None,
        include_metadata: bool = True,
    ) -> list[dict[str, Any]]:
        """
        Similarity search.
        Returns list of {id, score, metadata} dicts sorted by score desc.
        """
        vector = await self.embed(text)
        try:
            result = self._index.query(
                vector=vector,
                top_k=top_k,
                namespace=namespace,
                filter=filter,
                include_metadata=include_metadata,
                include_values=False,
            )
            return [
                {
                    "id":       m.id,
                    "score":    m.score,
                    "metadata": m.metadata or {},
                }
                for m in result.matches
            ]
        except Exception as exc:
            raise VectorDBError(
                message=f"Pinecone query failed: {exc}",
                detail={"query_preview": text[:100]},
            ) from exc

    async def query_by_id(
        self,
        entity_id: str,
        top_k:     int = 10,
        namespace: str = NS_ENTITIES,
        filter:    dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Find entities similar to `entity_id` (fetch its vector, then query).
        Used by Entity Resolution Agent for cross-platform matching.
        """
        try:
            fetch_result = self._index.fetch(ids=[entity_id], namespace=namespace)
            vectors_map  = fetch_result.vectors
        except Exception as exc:
            raise VectorDBError(
                message=f"Pinecone fetch-by-id failed: {exc}",
                detail={"entity_id": entity_id},
            ) from exc

        if entity_id not in vectors_map:
            return []

        existing_vec = vectors_map[entity_id].values
        try:
            result = self._index.query(
                vector=existing_vec,
                top_k=top_k + 1,   # +1 because the entity itself will appear
                namespace=namespace,
                filter=filter,
                include_metadata=True,
                include_values=False,
            )
            # Exclude self-match
            return [
                {"id": m.id, "score": m.score, "metadata": m.metadata or {}}
                for m in result.matches
                if m.id != entity_id
            ][:top_k]
        except Exception as exc:
            raise VectorDBError(
                message=f"Pinecone similarity-by-id failed: {exc}",
            ) from exc

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, entity_ids: list[str], namespace: str = NS_ENTITIES) -> None:
        try:
            self._index.delete(ids=entity_ids, namespace=namespace)
        except Exception as exc:
            raise VectorDBError(message=f"Pinecone delete failed: {exc}") from exc

    # ── Stats ─────────────────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        try:
            return dict(self._index.describe_index_stats())
        except Exception as exc:
            raise VectorDBError(message=f"Pinecone stats failed: {exc}") from exc

    @staticmethod
    def stable_id(text: str) -> str:
        """Deterministic ID from text — for deduplication on upsert."""
        return hashlib.sha256(text.encode()).hexdigest()[:32]


# ── Singleton ─────────────────────────────────────────────────────────────────
pinecone_client = PineconeClient()
