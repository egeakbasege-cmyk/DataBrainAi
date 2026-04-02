-- ══════════════════════════════════════════════════════════════
-- Starcoins Strategy AI — Supabase / PostgreSQL 15 schema
-- Run once against your Supabase project SQL editor
-- ══════════════════════════════════════════════════════════════

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text        UNIQUE NOT NULL,
  hashed_password    text        NOT NULL,
  stripe_customer_id text,
  credits            integer     DEFAULT 0 CHECK (credits >= 0),
  free_used          boolean     DEFAULT false,
  total_analyses     integer     DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- Strategy analyses (full audit trail)
CREATE TABLE IF NOT EXISTS analyses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES users(id) ON DELETE CASCADE,
  input            text        NOT NULL,
  intent           text,
  confidence       numeric(4,3),
  business_context jsonb,
  metrics_computed jsonb,
  result           jsonb       NOT NULL DEFAULT '{}',
  pipeline_steps   jsonb,
  duration_ms      integer,
  cache_hit        boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_user_id_created
  ON analyses(user_id, created_at DESC);

-- Payment transactions
CREATE TABLE IF NOT EXISTS transactions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        REFERENCES users(id) ON DELETE SET NULL,
  bundle                integer     NOT NULL CHECK (bundle IN (1, 3, 10)),
  amount_usd            numeric(8,2),
  stripe_payment_intent text        UNIQUE,
  status                text        DEFAULT 'pending'
                                    CHECK (status IN ('pending','succeeded','failed')),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);

-- Rate limiting log
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id    uuid  REFERENCES users(id) ON DELETE CASCADE,
  window_key text,
  count      integer DEFAULT 1,
  PRIMARY KEY (user_id, window_key)
);

CREATE INDEX IF NOT EXISTS rate_limits_user_id_idx ON rate_limits(user_id);

-- Analyses: composite index covering user + time (already exists) + intent filtering
CREATE INDEX IF NOT EXISTS analyses_intent_idx ON analyses(intent);

-- Webhook idempotency
CREATE TABLE IF NOT EXISTS processed_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     text        UNIQUE NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- Auto-update users.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
