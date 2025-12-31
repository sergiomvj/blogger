-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 16.2 Batches
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_csv_filename TEXT,
  created_by TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- 16.3 Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,

  job_key TEXT NOT NULL, -- ex: hash do CSV row + blog_id
  idempotency_key TEXT NOT NULL,
  revision INT NOT NULL DEFAULT 1,

  blog_key TEXT NOT NULL,
  blog_id BIGINT NOT NULL,
  category TEXT,
  objective_pt TEXT,
  theme_pt TEXT,
  language_target TEXT NOT NULL CHECK (language_target IN ('pt','en','es')),
  word_count INT NOT NULL CHECK (word_count IN (500,1000,2000)),

  status TEXT NOT NULL DEFAULT 'queued',
  current_step TEXT NOT NULL DEFAULT 'T0',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,

  wp_post_id BIGINT,
  wp_post_url TEXT,

  selected BOOLEAN NOT NULL DEFAULT FALSE, -- checkmark selection

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_jobs_batch ON jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_selected ON jobs(selected);

-- 16.4 Job Artifacts
CREATE TABLE IF NOT EXISTS job_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  revision INT NOT NULL,
  task TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  json_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, revision, task)
);

CREATE INDEX IF NOT EXISTS idx_artifacts_job_task ON job_artifacts(job_id, task);

-- 16.5 LLM Usage Events
CREATE TABLE IF NOT EXISTS llm_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  revision INT NOT NULL,
  task TEXT NOT NULL,

  provider_key TEXT NOT NULL, -- openrouter
  model_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,

  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,

  success BOOLEAN NOT NULL DEFAULT TRUE,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  event_type TEXT NOT NULL DEFAULT 'primary' CHECK (event_type IN ('primary','repair','fallback')),

  raw_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_events_job ON llm_usage_events(job_id);
CREATE INDEX IF NOT EXISTS idx_llm_events_task ON llm_usage_events(task);
CREATE INDEX IF NOT EXISTS idx_llm_events_model ON llm_usage_events(model_id);

-- 16.6 Pricing Profiles
CREATE TABLE IF NOT EXISTS pricing_profiles (
  profile_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  input_per_1m_tokens NUMERIC(12,6) NOT NULL,
  output_per_1m_tokens NUMERIC(12,6) NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default pricing profiles
INSERT INTO pricing_profiles(profile_key, display_name, input_per_1m_tokens, output_per_1m_tokens, notes)
VALUES
('google_gemini_dev', 'Google Gemini (Dev API)', 1.25, 10.00, 'What-if profile'),
('xai_grok4', 'xAI Grok-4', 3.00, 15.00, 'What-if profile'),
('anthropic_opus', 'Anthropic Claude Opus', 5.00, 25.00, 'What-if profile'),
('openai_top', 'OpenAI (top tier)', 3.50, 28.00, 'What-if profile')
ON CONFLICT (profile_key) DO NOTHING;

-- 16.7 Job Cost Estimates
CREATE TABLE IF NOT EXISTS job_cost_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  revision INT NOT NULL,
  profile_key TEXT REFERENCES pricing_profiles(profile_key) ON DELETE RESTRICT,
  estimated_cost_usd NUMERIC(14,6) NOT NULL,
  breakdown_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, revision, profile_key)
);

CREATE INDEX IF NOT EXISTS idx_cost_job ON job_cost_estimates(job_id);

-- 16.8 Views

-- v_job_tokens
CREATE OR REPLACE VIEW v_job_tokens AS
SELECT
  j.id AS job_id,
  j.revision,
  COALESCE(SUM(e.input_tokens),0) AS total_input_tokens,
  COALESCE(SUM(e.output_tokens),0) AS total_output_tokens,
  COALESCE(SUM(e.latency_ms),0) AS total_latency_ms,
  COALESCE(SUM(CASE WHEN e.fallback_used THEN 1 ELSE 0 END),0) AS fallback_count
FROM jobs j
LEFT JOIN llm_usage_events e ON e.job_id = j.id AND e.revision = j.revision
GROUP BY j.id, j.revision;

-- v_batch_costs
CREATE OR REPLACE VIEW v_batch_costs AS
SELECT
  b.id AS batch_id,
  c.profile_key,
  COALESCE(SUM(c.estimated_cost_usd),0) AS total_cost
FROM batches b
JOIN jobs j ON j.batch_id = b.id
JOIN job_cost_estimates c ON c.job_id = j.id AND c.revision = j.revision
GROUP BY b.id, c.profile_key;
