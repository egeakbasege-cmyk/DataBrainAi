-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECT AETHERIS — Shadow Context Schema
-- Run AFTER schema.sql (requires the vector extension and ai schema already set up)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Shadow Context table ──────────────────────────────────────────────────────
-- One row per (session_id, dimension) — upserted each turn.
CREATE TABLE IF NOT EXISTS shadow_context (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            text        NOT NULL,
  user_id               text        NOT NULL,
  dimension             text        NOT NULL,    -- e.g. "Market Penetration"
  context_text          text        NOT NULL,    -- Full narrative context
  vector_summary        text        NOT NULL,    -- Condensed text used for embedding
  embedding             vector(384),             -- gte-small
  current_velocity      float       NOT NULL DEFAULT 0,
  target_velocity       float       NOT NULL DEFAULT 0,
  inflection_point_date date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_shadow_session_dimension UNIQUE (session_id, dimension)
);

-- Index: fast lookup by user for recency fallback
CREATE INDEX IF NOT EXISTS shadow_context_user_idx
  ON shadow_context (user_id, created_at DESC);

-- Index: vector similarity search
CREATE INDEX IF NOT EXISTS shadow_context_embedding_idx
  ON shadow_context USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Full-text fallback index
CREATE INDEX IF NOT EXISTS shadow_context_summary_fts
  ON shadow_context USING gin(to_tsvector('english', vector_summary));

-- ── RPC: upsert_shadow_context ────────────────────────────────────────────────
-- Generates an embedding from p_vector_summary using Supabase AI (gte-small),
-- then upserts the shadow context record keyed on (session_id, dimension).
-- Falls back to storing without embedding if the ai schema is unavailable.
CREATE OR REPLACE FUNCTION upsert_shadow_context(
  p_session_id            text,
  p_user_id               text,
  p_dimension             text,
  p_context_text          text,
  p_vector_summary        text,
  p_current_velocity      float  DEFAULT 0,
  p_target_velocity       float  DEFAULT 0,
  p_inflection_point_date text   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_embedding vector(384);
  v_date      date;
BEGIN
  -- Parse inflection point date (nullable)
  BEGIN
    v_date := p_inflection_point_date::date;
  EXCEPTION WHEN OTHERS THEN
    v_date := NULL;
  END;

  -- Attempt to generate embedding via Supabase AI
  BEGIN
    v_embedding := ai.embed('gte-small', p_vector_summary);
  EXCEPTION WHEN OTHERS THEN
    v_embedding := NULL;  -- Degrade gracefully if ai extension unavailable
  END;

  INSERT INTO shadow_context (
    session_id, user_id, dimension, context_text, vector_summary,
    embedding, current_velocity, target_velocity, inflection_point_date,
    updated_at
  )
  VALUES (
    p_session_id, p_user_id, p_dimension, p_context_text, p_vector_summary,
    v_embedding, p_current_velocity, p_target_velocity, v_date,
    now()
  )
  ON CONFLICT (session_id, dimension)
  DO UPDATE SET
    context_text          = EXCLUDED.context_text,
    vector_summary        = EXCLUDED.vector_summary,
    embedding             = EXCLUDED.embedding,
    current_velocity      = EXCLUDED.current_velocity,
    target_velocity       = EXCLUDED.target_velocity,
    inflection_point_date = EXCLUDED.inflection_point_date,
    updated_at            = now();
END;
$$;

-- ── RPC: match_shadow_context ────────────────────────────────────────────────
-- Retrieves the top match_count most similar shadow context records for a user.
-- Uses pgvector cosine similarity when embeddings are available;
-- falls back to full-text search on vector_summary otherwise.
CREATE OR REPLACE FUNCTION match_shadow_context(
  query_text  text,
  p_user_id   text,
  match_count int  DEFAULT 3
)
RETURNS TABLE (
  id                    uuid,
  session_id            text,
  user_id               text,
  dimension             text,
  context_text          text,
  vector_summary        text,
  current_velocity      float,
  target_velocity       float,
  inflection_point_date text,
  created_at            text,
  similarity            float
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(384);
BEGIN
  -- Attempt vector path
  BEGIN
    query_embedding := ai.embed('gte-small', query_text);
  EXCEPTION WHEN OTHERS THEN
    -- ai extension unavailable — fall through to text search
    RETURN QUERY
      SELECT
        sc.id,
        sc.session_id,
        sc.user_id,
        sc.dimension,
        sc.context_text,
        sc.vector_summary,
        sc.current_velocity,
        sc.target_velocity,
        sc.inflection_point_date::text,
        sc.created_at::text,
        ts_rank(
          to_tsvector('english', sc.vector_summary),
          websearch_to_tsquery('english', query_text)
        )::float AS similarity
      FROM shadow_context sc
      WHERE sc.user_id = p_user_id
        AND to_tsvector('english', sc.vector_summary)
            @@ websearch_to_tsquery('english', query_text)
      ORDER BY similarity DESC
      LIMIT match_count;
    RETURN;
  END;

  -- Vector similarity path
  RETURN QUERY
    SELECT
      sc.id,
      sc.session_id,
      sc.user_id,
      sc.dimension,
      sc.context_text,
      sc.vector_summary,
      sc.current_velocity,
      sc.target_velocity,
      sc.inflection_point_date::text,
      sc.created_at::text,
      (1 - (sc.embedding <=> query_embedding))::float AS similarity
    FROM shadow_context sc
    WHERE sc.user_id = p_user_id
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
