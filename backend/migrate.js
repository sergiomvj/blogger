import { pool } from './services/db.js';

const sqls = [
  `CREATE TABLE IF NOT EXISTS blog_styles (
    id VARCHAR(36) PRIMARY KEY,
    style_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tone_of_voice TEXT,
    target_audience TEXT,
    editorial_guidelines JSON,
    cta_config JSON,
    forbidden_terms JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS article_styles (
    id VARCHAR(36) PRIMARY KEY,
    style_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    structure_blueprint JSON,
    typical_word_count INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS blogs (
    id VARCHAR(36) PRIMARY KEY,
    blog_key VARCHAR(50) UNIQUE NOT NULL,
    blog_id BIGINT NOT NULL,
    style_key VARCHAR(50),
    name TEXT,
    site_url TEXT,
    api_url TEXT,
    hmac_secret TEXT,
    auth_credentials JSON,
    categories_json JSON,
    authors_json JSON,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_discovery TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (style_key) REFERENCES blog_styles(style_key)
  )`,

  `CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(36) PRIMARY KEY,
    name TEXT NOT NULL,
    source_csv_filename TEXT,
    created_by TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    budget_limit DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36),
    job_key TEXT NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    revision INT NOT NULL DEFAULT 1,
    blog_key TEXT NOT NULL,
    blog_id BIGINT NOT NULL,
    category TEXT,
    article_style_key VARCHAR(50),
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
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (idempotency_key),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (article_style_key) REFERENCES article_styles(style_key)
  )`,

  `CREATE TABLE IF NOT EXISTS job_artifacts (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36),
    revision INT NOT NULL,
    task VARCHAR(50) NOT NULL,
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    json_data JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_id, revision, task),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS llm_usage_events (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36),
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
    raw_meta JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS pricing_profiles (
    profile_key VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    input_per_1m_tokens DECIMAL(12,6) NOT NULL,
    output_per_1m_tokens DECIMAL(12,6) NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS job_cost_estimates (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36),
    revision INT NOT NULL,
    profile_key VARCHAR(50),
    estimated_cost_usd DECIMAL(14,6) NOT NULL,
    breakdown_json JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_id, revision, profile_key),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (profile_key) REFERENCES pricing_profiles(profile_key) ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    openai_api_key TEXT,
    openrouter_api_key TEXT,
    anthropic_api_key TEXT,
    stability_api_key TEXT,
    google_api_key TEXT,
    image_mode VARCHAR(50) DEFAULT 'dalle3',
    base_prompt TEXT,
    use_llm_strategy TINYINT(1) DEFAULT 1,
    provider_openai_enabled TINYINT(1) DEFAULT 1,
    provider_anthropic_enabled TINYINT(1) DEFAULT 1,
    provider_google_enabled TINYINT(1) DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS custom_prompts (
    task_key VARCHAR(50) PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36),
    type VARCHAR(50),
    url TEXT,
    remote_url TEXT,
    alt_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`
];

async function migrate() {
  try {
    console.log('Starting migration for MariaDB/MySQL...');
    for (const sql of sqls) {
      await pool.query(sql);
    }
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
