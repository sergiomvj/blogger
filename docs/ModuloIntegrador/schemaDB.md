Perfeito — **#2: Schema do Banco (Postgres)**, já pronto pra suportar **criar/editar/excluir artigos**, **taxonomia**, **mídia**, **multi-idioma**, **idempotência** e **auditoria** via `integration_events`.

> **Arquivo 02 — `blog_schema_postgres.sql`**

```sql
-- ============================================================================
-- Blog Publishing Schema (Postgres)
-- Focus: posts + taxonomy + media + audit + idempotency
-- Compatible with an external Publisher Hub using Idempotency-Key + external_id
-- ============================================================================

-- Optional extension for UUID generation.
-- If you already use gen_random_uuid() (pgcrypto), keep only that extension.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tenancy (optional)
-- If each client has its own database, you can drop tenant_id columns + this table
-- ----------------------------------------------------------------------------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Authors
-- ----------------------------------------------------------------------------
create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  name text not null,
  slug text not null,
  bio text null,
  avatar_media_id uuid null, -- references media(id) created later (add FK after media)
  social_links jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint authors_slug_unique unique (tenant_id, slug)
);

create trigger trg_authors_updated_at
before update on authors
for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Media
-- ----------------------------------------------------------------------------
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  external_source text null,           -- e.g. "PublisherHub"
  external_id text null,               -- stable id from external system

  type text not null,                  -- image|video|audio|document
  url text not null,
  storage_key text null,               -- key in S3/R2/local storage
  alt_text text null,
  caption text null,
  width int null,
  height int null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_type_check check (type in ('image','video','audio','document')),
  constraint media_external_unique unique (tenant_id, external_source, external_id)
);

create index if not exists idx_media_tenant_created on media (tenant_id, created_at desc);
create index if not exists idx_media_external on media (tenant_id, external_source, external_id);

create trigger trg_media_updated_at
before update on media
for each row execute function set_updated_at();

-- Now add FK for authors.avatar_media_id
alter table authors
  add constraint authors_avatar_media_fk
  foreign key (avatar_media_id) references media(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Taxonomy: Categories + Tags
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  name text not null,
  slug text not null,
  parent_id uuid null references categories(id) on delete set null,
  language text null, -- e.g. pt-BR, en, es (nullable for "shared")

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_slug_unique unique (tenant_id, language, slug)
);

create index if not exists idx_categories_parent on categories (tenant_id, parent_id);
create index if not exists idx_categories_language on categories (tenant_id, language);

create trigger trg_categories_updated_at
before update on categories
for each row execute function set_updated_at();

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  name text not null,
  slug text not null,
  language text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tags_slug_unique unique (tenant_id, language, slug)
);

create index if not exists idx_tags_language on tags (tenant_id, language);

create trigger trg_tags_updated_at
before update on tags
for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Posts
-- ----------------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  external_source text null,           -- e.g. "PublisherHub"
  external_id text null,               -- stable id from external system (reconciliation)

  title text not null,
  slug text not null,
  excerpt text null,

  content text not null,
  content_format text not null default 'markdown', -- markdown|html|blocks

  status text not null default 'draft',            -- draft|scheduled|published|archived
  language text not null,                          -- pt-BR|en|es etc.

  author_id uuid null references authors(id) on delete set null,
  featured_image_id uuid null references media(id) on delete set null,

  published_at timestamptz null,
  scheduled_at timestamptz null,

  -- SEO
  seo_title text null,
  seo_description text null,
  canonical_url text null,
  og_title text null,
  og_description text null,
  og_image_url text null,
  keywords text[] null,

  -- Options / metadata
  allow_comments boolean not null default true,
  is_pillar boolean not null default false,
  reading_time_minutes int null,

  -- Optimistic concurrency (optional but recommended)
  version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,

  constraint posts_status_check check (status in ('draft','scheduled','published','archived')),
  constraint posts_content_format_check check (content_format in ('markdown','html','blocks')),

  -- Slug uniqueness by tenant + language, ignoring deleted posts
  -- Note: partial unique index below handles soft delete better than a constraint
  constraint posts_external_unique unique (tenant_id, external_source, external_id)
);

-- Slug must be unique among non-deleted posts (soft delete)
create unique index if not exists ux_posts_slug_active
on posts (tenant_id, language, slug)
where deleted_at is null;

-- Useful indexes
create index if not exists idx_posts_tenant_status on posts (tenant_id, status);
create index if not exists idx_posts_tenant_language on posts (tenant_id, language);
create index if not exists idx_posts_published_at on posts (tenant_id, published_at desc);
create index if not exists idx_posts_scheduled_at on posts (tenant_id, scheduled_at desc);
create index if not exists idx_posts_external on posts (tenant_id, external_source, external_id);

create trigger trg_posts_updated_at
before update on posts
for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Post revisions (optional but recommended)
-- ----------------------------------------------------------------------------
create table if not exists post_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  post_id uuid not null references posts(id) on delete cascade,
  version int not null,

  title text not null,
  excerpt text null,
  content text not null,
  content_format text not null,

  seo_title text null,
  seo_description text null,
  canonical_url text null,
  og_title text null,
  og_description text null,
  og_image_url text null,
  keywords text[] null,

  created_at timestamptz not null default now(),
  created_by text null, -- could store user id/email/service name

  constraint post_revisions_version_unique unique (post_id, version),
  constraint post_revisions_content_format_check check (content_format in ('markdown','html','blocks'))
);

create index if not exists idx_post_revisions_post on post_revisions (post_id, version desc);

-- ----------------------------------------------------------------------------
-- Post <-> Categories, Post <-> Tags
-- ----------------------------------------------------------------------------
create table if not exists post_categories (
  post_id uuid not null references posts(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, category_id)
);

create index if not exists idx_post_categories_category on post_categories (category_id);

create table if not exists post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);

create index if not exists idx_post_tags_tag on post_tags (tag_id);

-- ----------------------------------------------------------------------------
-- Post <-> Media (inline/gallery/attachments)
-- ----------------------------------------------------------------------------
create table if not exists post_media (
  post_id uuid not null references posts(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,

  role text not null default 'inline',    -- featured|inline|gallery|attachment
  position int null,

  created_at timestamptz not null default now(),
  primary key (post_id, media_id),

  constraint post_media_role_check check (role in ('featured','inline','gallery','attachment'))
);

create index if not exists idx_post_media_role on post_media (post_id, role);
create index if not exists idx_post_media_media on post_media (media_id);

-- ----------------------------------------------------------------------------
-- Integration events (AUDIT + IDEMPOTENCY)
-- This is the backbone for reliability in integrations.
-- ----------------------------------------------------------------------------
create table if not exists integration_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,

  idempotency_key text not null,     -- from Idempotency-Key header
  request_id text null,              -- from X-Request-Id header

  action text not null,              -- create|update|delete
  resource_type text not null,       -- post|media|tag|category
  resource_id uuid null,             -- set after processing (e.g., post.id)

  external_source text null,         -- publisher hub identifier
  external_id text null,             -- external entity id from hub

  status text not null default 'accepted', -- accepted|processed|failed
  error_code text null,
  error_message text null,

  payload jsonb null,                -- optional: store request body (or a sanitized version)

  created_at timestamptz not null default now(),
  processed_at timestamptz null,

  constraint integration_events_action_check check (action in ('create','update','delete')),
  constraint integration_events_resource_type_check check (resource_type in ('post','media','tag','category')),
  constraint integration_events_status_check check (status in ('accepted','processed','failed')),

  -- Idempotency uniqueness per tenant
  constraint integration_events_idempotency_unique unique (tenant_id, idempotency_key)
);

create index if not exists idx_integration_events_tenant_created on integration_events (tenant_id, created_at desc);
create index if not exists idx_integration_events_status on integration_events (tenant_id, status, created_at desc);
create index if not exists idx_integration_events_external on integration_events (tenant_id, external_source, external_id);

-- ----------------------------------------------------------------------------
-- Optional: “soft delete” helper view for active posts
-- ----------------------------------------------------------------------------
create or replace view posts_active as
select *
from posts
where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Notes for application layer
-- ----------------------------------------------------------------------------
-- 1) When PATCHing a post, increment posts.version (application-level or trigger).
-- 2) When publishing, set published_at = now() if status becomes 'published' and published_at is null.
-- 3) For revisioning: insert into post_revisions with the "previous" snapshot before updating posts.
-- 4) For idempotency: on every write request:
--    - insert into integration_events (tenant_id, idempotency_key, action, resource_type, payload, status='accepted')
--    - if conflict on (tenant_id,idempotency_key), return the previously produced resource_id/result
--    - after processing: update integration_events set status='processed', resource_id=?, processed_at=now()
-- ----------------------------------------------------------------------------
```

---

Se quiser que eu siga **estritamente “um por um”** na mesma linha, o próximo (03) seria:

**#3 — Fluxo técnico do Publisher Hub (jobs, retries, DLQ, estados, e contratos de idempotência + reconciliação)**

Ou, se você preferir manter tudo no “lado cliente” primeiro, eu posso gerar antes:

**#3 (alternativo) — “Kit do Cliente”: endpoints + regras de permissão/scopes + estratégia de rotação de chaves (modelo de tabela `api_keys`)**.
