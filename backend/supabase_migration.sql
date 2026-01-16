
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. blog_styles
CREATE TABLE IF NOT EXISTS blog_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tone_of_voice TEXT,
    target_audience TEXT,
    editorial_guidelines JSONB,
    cta_config JSONB,
    forbidden_terms JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. article_styles
CREATE TABLE IF NOT EXISTS article_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    structure_blueprint JSONB,
    typical_word_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. blogs
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blog_key VARCHAR(50) UNIQUE NOT NULL,
    blog_id BIGINT NOT NULL,
    style_key VARCHAR(50) REFERENCES blog_styles(style_key),
    name TEXT,
    site_url TEXT,
    api_url TEXT,
    hmac_secret TEXT,
    auth_credentials JSONB,
    categories_json JSONB,
    authors_json JSONB,
    wp_user TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_discovery TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. batches
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    source_csv_filename TEXT,
    created_by TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    budget_limit DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    job_key TEXT NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    revision INT NOT NULL DEFAULT 1,
    blog_key TEXT NOT NULL,
    blog_id BIGINT NOT NULL,
    category TEXT,
    article_style_key VARCHAR(50) REFERENCES article_styles(style_key),
    objective_pt TEXT,
    theme_pt TEXT,
    language_target VARCHAR(10) NOT NULL,
    word_count INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    current_step VARCHAR(20) NOT NULL DEFAULT 'T0',
    progress INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    wp_post_id BIGINT,
    wp_post_url TEXT,
    selected BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. job_artifacts
CREATE TABLE IF NOT EXISTS job_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    revision INT NOT NULL,
    task VARCHAR(50) NOT NULL,
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    json_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, revision, task)
);

-- 7. llm_usage_events
CREATE TABLE IF NOT EXISTS llm_usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    revision INT NOT NULL,
    task VARCHAR(50) NOT NULL,
    provider_key VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(20) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    latency_ms INT NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
    event_type VARCHAR(20) NOT NULL DEFAULT 'primary',
    raw_meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. pricing_profiles
CREATE TABLE IF NOT EXISTS pricing_profiles (
    profile_key VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    input_per_1m_tokens DECIMAL(12,6) NOT NULL,
    output_per_1m_tokens DECIMAL(12,6) NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. job_cost_estimates
CREATE TABLE IF NOT EXISTS job_cost_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    revision INT NOT NULL,
    profile_key VARCHAR(50) REFERENCES pricing_profiles(profile_key) ON DELETE RESTRICT,
    estimated_cost_usd DECIMAL(14,6) NOT NULL,
    breakdown_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, revision, profile_key)
);

-- 10. settings
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    openai_api_key TEXT,
    openrouter_api_key TEXT,
    anthropic_api_key TEXT,
    stability_api_key TEXT,
    google_api_key TEXT,
    image_mode VARCHAR(50) DEFAULT 'dalle3',
    base_prompt TEXT,
    use_llm_strategy BOOLEAN DEFAULT TRUE,
    provider_openai_enabled BOOLEAN DEFAULT TRUE,
    provider_anthropic_enabled BOOLEAN DEFAULT TRUE,
    provider_google_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. custom_prompts
CREATE TABLE IF NOT EXISTS custom_prompts (
    task_key VARCHAR(50) PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. media_assets
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    type VARCHAR(50),
    url TEXT,
    remote_url TEXT,
    alt_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. pre_articles
CREATE TABLE IF NOT EXISTS pre_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blog_key VARCHAR(50) REFERENCES blogs(blog_key),
    category VARCHAR(100),
    article_style_key VARCHAR(50) REFERENCES article_styles(style_key),
    objective TEXT,
    theme TEXT NOT NULL,
    word_count INT DEFAULT 1000,
    language VARCHAR(10) DEFAULT 'pt',
    seo TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON blogs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pricing_profiles_updated_at BEFORE UPDATE ON pricing_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_custom_prompts_updated_at BEFORE UPDATE ON custom_prompts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pre_articles_updated_at BEFORE UPDATE ON pre_articles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Helper Functions (RPC) for Stats
CREATE OR REPLACE FUNCTION get_stats_summary()
RETURNS TABLE (
    total_articles BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cost_usd NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT j.id) as total_articles,
        COALESCE(SUM(u.input_tokens), 0)::BIGINT as total_input_tokens,
        COALESCE(SUM(u.output_tokens), 0)::BIGINT as total_output_tokens,
        SUM(
            (u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) +
            (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0)
        )::NUMERIC as total_cost_usd
    FROM jobs j
    LEFT JOIN llm_usage_events u ON j.id = u.job_id
    LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_stats_history()
RETURNS TABLE (
    date TEXT,
    llm NUMERIC,
    images INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(u.created_at, 'Mon DD') as date,
        SUM(
            (u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) +
            (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0)
        )::NUMERIC as llm,
        0 as images
    FROM llm_usage_events u
    LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key
    WHERE u.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY date, date_trunc('day', u.created_at)
    ORDER BY date_trunc('day', u.created_at) ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_stats_details()
RETURNS TABLE (
    label TEXT,
    provider TEXT,
    cost NUMERIC,
    unit_count BIGINT,
    unit_label TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.model_id as label,
        p.display_name as provider,
        SUM(
            (u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) +
            (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0)
        )::NUMERIC as cost,
        SUM(u.input_tokens + u.output_tokens)::BIGINT as unit_count,
        'Tokens'::TEXT as unit_label
    FROM llm_usage_events u
    JOIN pricing_profiles p ON u.model_id = p.profile_key
    GROUP BY u.model_id, p.display_name
    ORDER BY cost DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_batch_cost(b_id UUID)
RETURNS TABLE (
    current_cost NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT SUM(
        (u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) +
        (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0)
    )::NUMERIC as current_cost
    FROM jobs j
    JOIN llm_usage_events u ON j.id = u.job_id
    LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key
    WHERE j.batch_id = b_id;
END;
$$ LANGUAGE plpgsql;
