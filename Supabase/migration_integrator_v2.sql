-- ============================================================================
-- MIGRATION: INTEGRATOR PHASE 2 + DATABASE CORRECTIONS
-- ============================================================================

-- 1. DATABASE CORRECTIONS (SEO Table fixes)
-- Correction for seo_outline.linked_keywords type (ARRAY is a keyword, not a full type definition)
ALTER TABLE public.seo_outline 
  ALTER COLUMN linked_keywords TYPE text[] USING linked_keywords::text[];

-- 2. INTEGRATOR HUB ENHANCEMENTS
-- Add missing metadata columns to Publisher Media
ALTER TABLE public.publisher_media 
  ADD COLUMN IF NOT EXISTS width integer, 
  ADD COLUMN IF NOT EXISTS height integer;

-- Add tracking columns to Integration Events
ALTER TABLE public.integration_events 
  ADD COLUMN IF NOT EXISTS external_source text, 
  ADD COLUMN IF NOT EXISTS external_id text;

-- 3. PUBLISHER POSTS & REVISIONS
CREATE TABLE IF NOT EXISTS public.publisher_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  external_source text,           -- e.g. "PublisherHub"
  external_id text,               -- stable id from external system
  
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content text NOT NULL,
  content_format text NOT NULL DEFAULT 'markdown', -- markdown|html|blocks
  
  status text NOT NULL DEFAULT 'draft',            -- draft|scheduled|published|archived
  language text NOT NULL DEFAULT 'pt-BR',
  
  author_id uuid REFERENCES public.publisher_authors(id) ON DELETE SET NULL,
  featured_image_id uuid REFERENCES public.publisher_media(id) ON DELETE SET NULL,
  
  published_at timestamptz,
  scheduled_at timestamptz,
  
  -- SEO Metadata
  seo_title text,
  seo_description text,
  canonical_url text,
  keywords text[],
  
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  
  CONSTRAINT publisher_posts_external_unique UNIQUE (tenant_id, external_source, external_id)
);

CREATE TABLE IF NOT EXISTS public.publisher_post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.publisher_posts(id) ON DELETE CASCADE,
  version int NOT NULL,
  
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  content_format text NOT NULL DEFAULT 'markdown',
  
  seo_title text,
  seo_description text,
  keywords text[],
  
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  
  CONSTRAINT publisher_post_revisions_version_unique UNIQUE (post_id, version)
);

-- 4. PUBLISHER ITEM RELATIONSHIPS
CREATE TABLE IF NOT EXISTS public.publisher_post_categories (
  post_id uuid NOT NULL REFERENCES public.publisher_posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.publisher_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.publisher_post_tags (
  post_id uuid NOT NULL REFERENCES public.publisher_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.publisher_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.publisher_post_media (
  post_id uuid NOT NULL REFERENCES public.publisher_posts(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.publisher_media(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'inline', -- featured|inline|gallery|attachment
  position int,
  PRIMARY KEY (post_id, media_id)
);

-- 5. AUTOMATION & VIEWS
DROP TRIGGER IF EXISTS trg_publisher_posts_updated_at ON public.publisher_posts;
CREATE TRIGGER trg_publisher_posts_updated_at 
  BEFORE UPDATE ON public.publisher_posts 
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Active view (hides soft-deleted posts)
CREATE OR REPLACE VIEW public.publisher_posts_active AS 
  SELECT * FROM public.publisher_posts 
  WHERE deleted_at IS NULL;
