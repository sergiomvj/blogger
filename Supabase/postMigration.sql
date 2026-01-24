-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.article_styles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  style_key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  structure_blueprint jsonb,
  typical_word_count integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT article_styles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.batches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  source_csv_filename text,
  created_by text,
  status character varying NOT NULL DEFAULT 'created'::character varying,
  budget_limit numeric DEFAULT NULL::numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT batches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blog_styles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  style_key character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text,
  tone_of_voice text,
  target_audience text,
  editorial_guidelines jsonb,
  cta_config jsonb,
  forbidden_terms jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blog_styles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  blog_key character varying NOT NULL UNIQUE,
  blog_id bigint NOT NULL,
  style_key character varying,
  name text,
  site_url text,
  api_url text,
  hmac_secret text,
  auth_credentials jsonb,
  categories_json jsonb,
  authors_json jsonb,
  wp_user text,
  is_active boolean NOT NULL DEFAULT true,
  last_discovery timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  architecture character varying DEFAULT 'EXISTING'::character varying,
  CONSTRAINT blogs_pkey PRIMARY KEY (id),
  CONSTRAINT blogs_style_key_fkey FOREIGN KEY (style_key) REFERENCES public.blog_styles(style_key)
);
CREATE TABLE public.custom_prompts (
  task_key character varying NOT NULL,
  prompt_text text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_prompts_pkey PRIMARY KEY (task_key)
);
CREATE TABLE public.integration_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  idempotency_key text NOT NULL,
  request_id text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  status text NOT NULL DEFAULT 'accepted'::text,
  error_code text,
  error_message text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  external_source text,
  external_id text,
  CONSTRAINT integration_events_pkey PRIMARY KEY (id),
  CONSTRAINT integration_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.job_artifacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid,
  revision integer NOT NULL,
  task character varying NOT NULL,
  schema_version character varying NOT NULL DEFAULT '1.0.0'::character varying,
  json_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_artifacts_pkey PRIMARY KEY (id),
  CONSTRAINT job_artifacts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.job_cost_estimates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid,
  revision integer NOT NULL,
  profile_key character varying,
  estimated_cost_usd numeric NOT NULL,
  breakdown_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_cost_estimates_pkey PRIMARY KEY (id),
  CONSTRAINT job_cost_estimates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_cost_estimates_profile_key_fkey FOREIGN KEY (profile_key) REFERENCES public.pricing_profiles(profile_key)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  batch_id uuid,
  job_key text NOT NULL,
  idempotency_key character varying NOT NULL UNIQUE,
  revision integer NOT NULL DEFAULT 1,
  blog_key text NOT NULL,
  blog_id bigint NOT NULL,
  category text,
  article_style_key character varying,
  objective_pt text,
  theme_pt text,
  language_target character varying NOT NULL,
  word_count integer NOT NULL,
  status character varying NOT NULL DEFAULT 'queued'::character varying,
  current_step character varying NOT NULL DEFAULT 'T0'::character varying,
  progress integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  wp_post_id bigint,
  wp_post_url text,
  selected boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id),
  CONSTRAINT jobs_article_style_key_fkey FOREIGN KEY (article_style_key) REFERENCES public.article_styles(style_key)
);
CREATE TABLE public.llm_usage_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid,
  revision integer NOT NULL,
  task character varying NOT NULL,
  provider_key character varying NOT NULL,
  model_id character varying NOT NULL,
  prompt_version character varying NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  fallback_used boolean NOT NULL DEFAULT false,
  event_type character varying NOT NULL DEFAULT 'primary'::character varying,
  raw_meta jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT llm_usage_events_pkey PRIMARY KEY (id),
  CONSTRAINT llm_usage_events_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.media_assets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid,
  type character varying,
  url text,
  remote_url text,
  alt_text text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT media_assets_pkey PRIMARY KEY (id),
  CONSTRAINT media_assets_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.pre_articles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  blog_key character varying,
  category character varying,
  article_style_key character varying,
  objective text,
  theme text NOT NULL,
  word_count integer DEFAULT 1000,
  language character varying DEFAULT 'pt'::character varying,
  seo text,
  status character varying DEFAULT 'pending'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pre_articles_pkey PRIMARY KEY (id),
  CONSTRAINT pre_articles_blog_key_fkey FOREIGN KEY (blog_key) REFERENCES public.blogs(blog_key),
  CONSTRAINT pre_articles_article_style_key_fkey FOREIGN KEY (article_style_key) REFERENCES public.article_styles(style_key)
);
CREATE TABLE public.pricing_profiles (
  profile_key character varying NOT NULL,
  display_name character varying NOT NULL,
  currency character varying NOT NULL DEFAULT 'USD'::character varying,
  input_per_1m_tokens numeric NOT NULL,
  output_per_1m_tokens numeric NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pricing_profiles_pkey PRIMARY KEY (profile_key)
);
CREATE TABLE public.publisher_authors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  bio text,
  avatar_url text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT publisher_authors_pkey PRIMARY KEY (id),
  CONSTRAINT publisher_authors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.publisher_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid,
  language text DEFAULT 'pt-BR'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT publisher_categories_pkey PRIMARY KEY (id),
  CONSTRAINT publisher_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT publisher_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.publisher_categories(id)
);
CREATE TABLE public.publisher_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  external_source text,
  external_id text,
  type text NOT NULL,
  url text NOT NULL,
  storage_key text,
  alt_text text,
  caption text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  width integer,
  height integer,
  CONSTRAINT publisher_media_pkey PRIMARY KEY (id),
  CONSTRAINT publisher_media_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.publisher_post_categories (
  post_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT publisher_post_categories_pkey PRIMARY KEY (post_id, category_id),
  CONSTRAINT publisher_post_categories_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.publisher_posts(id),
  CONSTRAINT publisher_post_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.publisher_categories(id)
);
CREATE TABLE public.publisher_post_media (
  post_id uuid NOT NULL,
  media_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'inline'::text,
  position integer,
  CONSTRAINT publisher_post_media_pkey PRIMARY KEY (post_id, media_id),
  CONSTRAINT publisher_post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.publisher_posts(id),
  CONSTRAINT publisher_post_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.publisher_media(id)
);
CREATE TABLE public.publisher_post_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  version integer NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  content_format text NOT NULL DEFAULT 'markdown'::text,
  seo_title text,
  seo_description text,
  keywords ARRAY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text,
  CONSTRAINT publisher_post_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT publisher_post_revisions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.publisher_posts(id)
);
CREATE TABLE public.publisher_post_tags (
  post_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT publisher_post_tags_pkey PRIMARY KEY (post_id, tag_id),
  CONSTRAINT publisher_post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.publisher_posts(id),
  CONSTRAINT publisher_post_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.publisher_tags(id)
);
CREATE TABLE public.publisher_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  external_source text,
  external_id text,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text NOT NULL,
  content_format text NOT NULL DEFAULT 'markdown'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  language text NOT NULL DEFAULT 'pt-BR'::text,
  author_id uuid,
  featured_image_id uuid,
  published_at timestamp with time zone,
  scheduled_at timestamp with time zone,
  seo_title text,
  seo_description text,
  canonical_url text,
  keywords ARRAY,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT publisher_posts_pkey PRIMARY KEY (id),
  CONSTRAINT publisher_posts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT publisher_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.publisher_authors(id),
  CONSTRAINT publisher_posts_featured_image_id_fkey FOREIGN KEY (featured_image_id) REFERENCES public.publisher_media(id)
);
CREATE TABLE public.publisher_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  language text DEFAULT 'pt-BR'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT publisher_tags_pkey PRIMARY KEY (id),
  CONSTRAINT publisher_tags_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.seo_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  topic text NOT NULL,
  language text DEFAULT 'pt-BR'::text,
  region text DEFAULT 'BR'::text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_articles_pkey PRIMARY KEY (id),
  CONSTRAINT seo_articles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.seo_projects(id)
);
CREATE TABLE public.seo_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  keyword text NOT NULL,
  type text,
  volume_estimate integer,
  competition text,
  trend_score numeric,
  intent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_keywords_pkey PRIMARY KEY (id),
  CONSTRAINT seo_keywords_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.seo_articles(id)
);
CREATE TABLE public.seo_llm_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  input_cost_per_1k numeric,
  output_cost_per_1k numeric,
  api_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_llm_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.seo_llm_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  provider_name text,
  tokens_input integer,
  tokens_output integer,
  estimated_cost numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_llm_usage_pkey PRIMARY KEY (id),
  CONSTRAINT seo_llm_usage_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.seo_articles(id)
);
CREATE TABLE public.seo_meta (
  article_id uuid NOT NULL,
  meta_title text,
  meta_description text,
  faq_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_meta_pkey PRIMARY KEY (article_id),
  CONSTRAINT seo_meta_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.seo_articles(id)
);
CREATE TABLE public.seo_outline (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  heading_type text,
  heading_text text,
  linked_keywords ARRAY,
  position integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_outline_pkey PRIMARY KEY (id),
  CONSTRAINT seo_outline_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.seo_articles(id)
);
CREATE TABLE public.seo_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_projects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.seo_scores (
  article_id uuid NOT NULL,
  overall_score integer,
  readability_score integer,
  semantic_score integer,
  status text,
  evaluated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_scores_pkey PRIMARY KEY (article_id),
  CONSTRAINT seo_scores_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.seo_articles(id)
);
CREATE TABLE public.seo_semantics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  article_id uuid,
  term text NOT NULL,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_semantics_pkey PRIMARY KEY (id),
  CONSTRAINT seo_semantics_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.seo_articles(id)
);
CREATE TABLE public.settings (
  id integer NOT NULL DEFAULT 1,
  openai_api_key text,
  openrouter_api_key text,
  anthropic_api_key text,
  stability_api_key text,
  google_api_key text,
  image_mode character varying DEFAULT 'dalle3'::character varying,
  base_prompt text,
  use_llm_strategy boolean DEFAULT true,
  provider_openai_enabled boolean DEFAULT true,
  provider_anthropic_enabled boolean DEFAULT true,
  provider_google_enabled boolean DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  main_provider character varying DEFAULT 'openai'::character varying,
  provider_openrouter_enabled boolean DEFAULT true,
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);