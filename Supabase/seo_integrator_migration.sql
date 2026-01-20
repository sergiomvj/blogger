-- ============================================================================
-- SEO INTELLIGENCE & UNIVERSAL INTEGRATOR CONSOLIDATED MIGRATION
-- ============================================================================

-- 0. SETUP
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. UNIVERSAL INTEGRATOR (Multi-tenant Foundation)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Authors (Enhanced from JSON)
CREATE TABLE IF NOT EXISTS public.publisher_authors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    bio text,
    avatar_url text,
    social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT publisher_authors_slug_unique UNIQUE (tenant_id, slug)
);

-- Extended Media (Legacy table remains, this is for the new engine)
CREATE TABLE IF NOT EXISTS public.publisher_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    external_source text,
    external_id text,
    type text NOT NULL, -- image|video|audio|document
    url text NOT NULL,
    storage_key text,
    alt_text text,
    caption text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT publisher_media_external_unique UNIQUE (tenant_id, external_source, external_id)
);

-- Taxonomy
CREATE TABLE IF NOT EXISTS public.publisher_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id uuid REFERENCES public.publisher_categories(id) ON DELETE SET NULL,
    language text DEFAULT 'pt-BR',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT publisher_categories_slug_unique UNIQUE (tenant_id, language, slug)
);

CREATE TABLE IF NOT EXISTS public.publisher_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    language text DEFAULT 'pt-BR',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT publisher_tags_slug_unique UNIQUE (tenant_id, language, slug)
);

-- Integration Events (Idempotency & Audit)
CREATE TABLE IF NOT EXISTS public.integration_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    request_id text,
    action text NOT NULL, -- create|update|delete
    resource_type text NOT NULL, -- post|media|taxonomy
    resource_id uuid,
    status text NOT NULL DEFAULT 'accepted', -- accepted|processed|failed
    error_code text,
    error_message text,
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    CONSTRAINT integration_events_idempotency_unique UNIQUE (tenant_id, idempotency_key)
);

-- ----------------------------------------------------------------------------
-- 2. SEO INTELLIGENCE ENGINE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seo_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    topic text NOT NULL,
    language text DEFAULT 'pt-BR',
    region text DEFAULT 'BR',
    status text DEFAULT 'pending', -- pending, analyzing, completed
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_keywords (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id uuid REFERENCES public.seo_articles(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    type text, -- primary, secondary, long_tail
    volume_estimate integer,
    competition text,
    trend_score numeric,
    intent text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_semantics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id uuid REFERENCES public.seo_articles(id) ON DELETE CASCADE,
    term text NOT NULL,
    category text, -- lsi, synonym, concept
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_outline (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id uuid REFERENCES public.seo_articles(id) ON DELETE CASCADE,
    heading_type text, -- h1, h2, h3
    heading_text text,
    linked_keywords text[],
    position integer,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_meta (
    article_id uuid PRIMARY KEY REFERENCES public.seo_articles(id) ON DELETE CASCADE,
    meta_title text,
    meta_description text,
    faq_data jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_scores (
    article_id uuid PRIMARY KEY REFERENCES public.seo_articles(id) ON DELETE CASCADE,
    overall_score integer,
    readability_score integer,
    semantic_score integer,
    status text, -- ready, review, rework
    evaluated_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. LLM COST & PROVIDERS (Extended)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seo_llm_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    input_cost_per_1k numeric,
    output_cost_per_1k numeric,
    api_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_llm_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id uuid REFERENCES public.seo_articles(id) ON DELETE SET NULL,
    provider_name text,
    tokens_input integer,
    tokens_output integer,
    estimated_cost numeric,
    created_at timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_publisher_authors_updated_at ON public.publisher_authors;
CREATE TRIGGER trg_publisher_authors_updated_at BEFORE UPDATE ON public.publisher_authors FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_publisher_media_updated_at ON public.publisher_media;
CREATE TRIGGER trg_publisher_media_updated_at BEFORE UPDATE ON public.publisher_media FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_publisher_categories_updated_at ON public.publisher_categories;
CREATE TRIGGER trg_publisher_categories_updated_at BEFORE UPDATE ON public.publisher_categories FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trg_publisher_tags_updated_at ON public.publisher_tags;
CREATE TRIGGER trg_publisher_tags_updated_at BEFORE UPDATE ON public.publisher_tags FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
