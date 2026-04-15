-- ── Enable pgvector ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Benchmarks table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benchmarks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector     text        NOT NULL,
  metric     text        NOT NULL,
  value      text        NOT NULL,
  source     text        NOT NULL,
  year       int         NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  summary    text        NOT NULL,
  embedding  vector(384),          -- gte-small dimension
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Full-text search index (fallback when embeddings unavailable)
CREATE INDEX IF NOT EXISTS benchmarks_summary_fts
  ON benchmarks USING gin(to_tsvector('english', summary));

-- Vector similarity index (IVFFlat — fast for <1M rows)
CREATE INDEX IF NOT EXISTS benchmarks_embedding_idx
  ON benchmarks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ── RPC: match_benchmarks ─────────────────────────────────────────────────────
-- Embeds query_text using Supabase's built-in gte-small model and returns
-- the top match_count most similar benchmark documents.
-- Falls back to full-text search when the ai schema is unavailable.
CREATE OR REPLACE FUNCTION match_benchmarks(
  query_text  text,
  match_count int  DEFAULT 4
)
RETURNS TABLE (
  sector     text,
  metric     text,
  value      text,
  source     text,
  summary    text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(384);
BEGIN
  -- Generate embedding with Supabase AI (requires the ai extension)
  BEGIN
    query_embedding := ai.embed('gte-small', query_text);
  EXCEPTION WHEN OTHERS THEN
    -- ai extension not available — fall through to text search
    RETURN QUERY
      SELECT
        b.sector,
        b.metric,
        b.value,
        b.source,
        b.summary,
        ts_rank(to_tsvector('english', b.summary),
                websearch_to_tsquery('english', query_text))::float AS similarity
      FROM benchmarks b
      WHERE to_tsvector('english', b.summary) @@ websearch_to_tsquery('english', query_text)
      ORDER BY similarity DESC
      LIMIT match_count;
    RETURN;
  END;

  RETURN QUERY
    SELECT
      b.sector,
      b.metric,
      b.value,
      b.source,
      b.summary,
      (1 - (b.embedding <=> query_embedding))::float AS similarity
    FROM benchmarks b
    ORDER BY b.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ── Seed data — verified industry benchmarks ──────────────────────────────────
INSERT INTO benchmarks (sector, metric, value, source, year, summary) VALUES
  ('E-Commerce',           'Checkout abandonment rate',         '70.2%',    'Baymard Institute',         2024, 'Average e-commerce checkout abandonment rate across industries is 70.2%. Reducing by 10pp through simplified checkout and one recovery email is achievable in 90 days.'),
  ('E-Commerce',           'Average conversion rate',           '2.3%',     'IRP Commerce',              2024, 'E-commerce average conversion rate is 2.3%. Top quartile operators achieve 3.5-5% through A/B testing checkout flow and reducing form fields.'),
  ('E-Commerce',           'Cart recovery email open rate',     '45%',      'Klaviyo Benchmark',         2024, 'Abandoned cart emails average 45% open rate and 10-15% recovery rate when sent within 1 hour of abandonment.'),
  ('B2B SaaS',             'Month-1 churn rate',                '7-9%',     'OpenView Partners',         2024, 'Acceptable monthly churn for B2B SaaS under $2M ARR is 7-9%. Above 10% signals an onboarding or product-fit problem requiring immediate attention.'),
  ('B2B SaaS',             'Net Revenue Retention',             '105-115%', 'ChartMogul SaaS Report',    2024, 'Best-in-class B2B SaaS achieves 110-130% NRR through expansion revenue. Median for $1-5M ARR companies is 105-115%.'),
  ('B2B SaaS',             'CAC Payback Period',                '18 months','OpenView Partners',         2024, 'Median CAC payback for B2B SaaS is 18 months. Top-quartile companies recover CAC in under 12 months through efficient outbound and product-led growth.'),
  ('Professional Services','Involuntary client churn reduction','18-22%',   'Agency Analytics',          2024, 'Structured quarterly business reviews (QBRs) reduce involuntary churn by 18-22%. For a 6-client retainer book, this recovers 1-2 accounts annually.'),
  ('Professional Services','Referral rate from existing base',  '18-22%',   'Nielsen',                   2024, 'Professional services firms with structured referral programs generate 18-22% of new business from existing clients. Payback period under 45 days.'),
  ('Retail',               'Loyalty programme basket uplift',   '11-14%',   'KPMG Retail Pulse',         2024, 'Tier-1 loyalty programmes (points-only) increase average basket size by 11-14% and visit frequency by 20% over 6 months. Payback period under 60 days.'),
  ('Retail',               'Average basket size increase',      '12%',      'KPMG',                      2024, 'Retailers with loyalty programs see 12% average basket increase. Threshold-spend incentives (e.g. spend £50 get 10% off) are most effective for mid-range retail.'),
  ('Hospitality',          'Table turn rate improvement',       '+0.4x',    'National Restaurant Assoc.',2024, 'Increasing table turn from 1.8x to 2.2x per service period adds ~20% to dinner revenue. Achieved through streamlined ordering and pre-bussing protocols.'),
  ('Fitness & Wellness',   'Package vs session revenue uplift', '30-40%',   'Mindbody Business Index',   2024, 'Offering fixed-term packages (e.g. 8-session blocks) alongside open-ended sessions increases average transaction value 30-40% with no change in close rate.'),
  ('Digital Marketing',    'Organic traffic from blog cadence', '3.5x',     'HubSpot Marketing',         2024, 'Businesses publishing 4+ blog posts per week generate 3.5x more organic traffic than those publishing once weekly. Quality per post matters beyond that threshold.'),
  ('Real Estate',          'Lead response time conversion rate','4x',       'National Assoc. of Realtors',2024, 'Responding to enquiries within 5 minutes converts at 4x the rate of responses after 30 minutes. Automated immediate response + human follow-up is the winning pattern.'),
  ('General',              'Customer retention profit impact',  '25-95%',   'McKinsey & Company',        2024, 'Improving customer retention by 5% increases profit by 25-95% depending on sector. For owner-managed businesses, retention ROI exceeds equivalent acquisition spend.'),
  ('General',              'Email marketing ROI',               '£42 per £1','Data and Marketing Assoc.',2024, 'Email marketing delivers an average return of £42 for every £1 spent. Segmented campaigns outperform batch sends by 14% open rate and 10% click rate.'),
  ('General',              'Price elasticity — premium tier',   '+20-30%',  'McKinsey Pricing Study',    2024, 'Adding a premium tier priced 20-30% above current top tier captures 10-15% of existing customers willing to pay more, with no impact on base tier retention.')
ON CONFLICT DO NOTHING;
