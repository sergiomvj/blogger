# AutoWriter Multisite – Final Implementation Pack (15, 16, 17)

Este arquivo consolida os **Passos 15, 16 e 17** em um único pacote para repassar ao time de desenvolvimento.

- **15:** Repair Prompts + regras de reparo por schema
- **16:** SQL completo (Dashboard – Postgres)
- **17:** Notas de implementação do Plugin WP (Multisite) – post/media/SEO/SSRF

---

# 15) Repair Prompts (por schema) + Validators

## 15.1 Regras globais de Repair

Quando um resultado de LLM:
- não for JSON parseável **ou**
- não validar contra o schema

Então:
1) registrar evento `llm_usage_events` (falha)
2) rodar **1** chamada de repair
3) se ainda falhar → fallback para próximo modelo

### Repair System (fixo)

```text
Você é um corretor de JSON.

Regras:
- Você receberá um SCHEMA JSON e um OUTPUT inválido.
- Sua resposta deve ser SOMENTE um JSON válido que passe no schema.
- Não adicione texto fora do JSON.
- Preserve o máximo de conteúdo sem inventar fatos.
- Se existir texto fora do JSON, remova.
- Se houver campos faltando, preencha com inferência mínima e segura.
- Se houver campos extras, remova.
- Se houver string que deveria ser array/objeto, converta corretamente.
- Use aspas ASCII (") e encoding UTF-8.
```

### Repair User (template)

```text
TASK: {task}
LANGUAGE: {language}
PROMPT_VERSION: {prompt_version}

SCHEMA:
{schema_json}

INVALID_OUTPUT:
{raw_output}

Return ONLY a JSON object that validates against SCHEMA.
```

## 15.2 Validadores (recomendação)

### 15.2.1 Parsing
- usar parse estrito
- recusar JSON com trailing text
- recusar `NaN`, `Infinity`

### 15.2.2 Schema validation
- AJV (Node) com draft 2020-12
- `allErrors: true`
- `removeAdditional: true` opcional (preferível remover manualmente via repair)

### 15.2.3 Sanitização extra (pós-schema)
Mesmo JSON válido pode conter:
- links suspeitos (SSRF)
- tags HTML perigosas

Aplicar:
- URL allowlist + bloqueio de IP/private ranges
- HTML sanitize (no WP final)

## 15.3 Repair Prompts por Task

> Observação: o template acima funciona para todas as tasks. Abaixo estão **complementos** (instruções adicionais) que podem ser anexadas ao repair user prompt por task.

### semantic_brief – Addendum
```text
Ensure:
- brief is a clear editorial summary
- audience is concise
- search_intent must be one of the allowed enum values
```

### outline – Addendum
```text
Ensure:
- title_candidates is array of 3–5 strings
- outline is array of sections with h2 + h3 array
- If h3 is missing, set to []
```

### keyword_plan – Addendum
```text
Ensure:
- primary_keyword is a string
- secondary_keywords and lsi_keywords are arrays
- keyword_to_section_map is array of {keyword,target}
- Remove duplicates where obvious
```

### seo_meta – Addendum
```text
Ensure:
- meta_description is a single string
- Do not exceed max length
```

### seo_title – Addendum
```text
Ensure:
- slug matches pattern: lowercase, hyphens, no accents
- If slug contains accents/spaces, normalize to ASCII and hyphens
```

### headings – Addendum
```text
Ensure:
- headings is array of {h2,h3}
- h3 must be an array (may be empty)
```

### article_body – Addendum
```text
Ensure:
- content_html is a string containing HTML only
- excerpt is plain text string
- Remove markdown fences and headings markers like ###
```

### tags – Addendum
```text
Ensure:
- tags is array of strings
- trim whitespace and remove duplicates
```

### faq – Addendum
```text
Ensure:
- faq is array of {q,a}
- q and a are strings
```

### internal_links – Addendum
```text
Ensure:
- internal_links is array of {anchor,url}
- url must be a string; keep as-is (do not fetch)
```

### image_prompt – Addendum
```text
Ensure:
- featured_prompt and top_prompt are strings
- featured_alt and top_alt are strings
- Do NOT add text overlays or logos instructions
```

### quality_gate – Addendum
```text
Ensure:
- passed is boolean
- notes is array of strings
- checks contains required booleans
```

## 15.4 Repair Examples (rápidos)

### Exemplo 1: texto extra fora do JSON
**Entrada inválida:**
```text
Claro! Aqui está:
{"task":"seo_meta","language":"pt","prompt_version":"1.0.0","data":{"meta_description":"..."}}
```
**Saída reparada (válida):**
```json
{"task":"seo_meta","language":"pt","prompt_version":"1.0.0","data":{"meta_description":"..."}}
```

### Exemplo 2: h3 como string
**Entrada inválida:**
```json
{"task":"headings","language":"pt","prompt_version":"1.0.0","data":{"headings":[{"h2":"...","h3":"sub1"}]}}
```
**Saída reparada:**
```json
{"task":"headings","language":"pt","prompt_version":"1.0.0","data":{"headings":[{"h2":"...","h3":["sub1"]}]}}
```

---

# 16) SQL Schema (Dashboard – Postgres)

> Objetivo: suportar batches, jobs, uso de LLM por task, estimativas de custo por provedor, e seleção por checkmark.

## 16.1 Extensões

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## 16.2 Batches

```sql
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
```

## 16.3 Jobs

```sql
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
```

## 16.4 Job Artifacts (outputs por etapa)

```sql
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
```

## 16.5 LLM Usage Events (tokens reais, latência, fallback)

```sql
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
```

## 16.6 Pricing Profiles (What-if)

```sql
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

-- Exemplo (ajuste quando quiser)
INSERT INTO pricing_profiles(profile_key, display_name, input_per_1m_tokens, output_per_1m_tokens, notes)
VALUES
('google_gemini_dev', 'Google Gemini (Dev API)', 1.25, 10.00, 'What-if profile'),
('xai_grok4', 'xAI Grok-4', 3.00, 15.00, 'What-if profile'),
('anthropic_opus', 'Anthropic Claude Opus', 5.00, 25.00, 'What-if profile'),
('openai_top', 'OpenAI (top tier)', 3.50, 28.00, 'What-if profile')
ON CONFLICT (profile_key) DO NOTHING;
```

## 16.7 Job Cost Estimates (por profile)

```sql
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
```

## 16.8 Views úteis

### 16.8.1 Tokens agregados por job
```sql
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
```

### 16.8.2 Custo simulado por batch (somatório)
```sql
CREATE OR REPLACE VIEW v_batch_costs AS
SELECT
  b.id AS batch_id,
  c.profile_key,
  COALESCE(SUM(c.estimated_cost_usd),0) AS total_cost
FROM batches b
JOIN jobs j ON j.batch_id = b.id
JOIN job_cost_estimates c ON c.job_id = j.id AND c.revision = j.revision
GROUP BY b.id, c.profile_key;
```

---

# 17) WordPress Plugin – Implementation Notes (Multisite)

## 17.1 Onde o plugin roda

- **Multisite:** plugin network-activated.
- Recebe chamadas do Dashboard, e **cria o post no site (blog) correto** usando `switch_to_blog($blog_id)`.

## 17.2 Regras essenciais

- **Idempotência:** `idempotency_key` → não criar duplicado.
- **Revisões:** se `revision` maior, atualizar o mesmo post.
- **Draft sempre:** status inicial `draft`.

## 17.3 Validação de payload (mínimo)

Validar no endpoint `/autowriter/v1/jobs`:
- `job_id`, `idempotency_key`, `blog_id`
- `post.title`, `post.slug`, `post.content_html`, `post.excerpt`
- `images.featured.source` e/ou `images.featured.url` (se existir)
- `seo.meta_description`

Rejeitar:
- JSON inválido
- campos inesperados (opcional)

## 17.4 Fluxo de criação/atualização de post

Pseudo:
1) `switch_to_blog($blog_id)`
2) checar idempotency
3) resolver categoria(s)
4) resolver tags
5) `wp_insert_post` (ou `wp_update_post` se já existe)
6) SEO fields (Yoast/RankMath)
7) Media upload/attach (featured/top)
8) salvar logs e status
9) `restore_current_blog()`

### 17.4.1 Categoria
- Se categoria não existir, criar (opcional, ou “fail safe” para categoria default)
- Use `get_category_by_slug` / `wp_insert_term`.

### 17.4.2 Tags
- Criar tags faltantes via `wp_set_post_tags` (com `append=true` se necessário)

### 17.4.3 Slug
- Use `sanitize_title`.
- Se slug já em uso, WordPress ajusta; logar o slug final.

## 17.5 Inserção do “top image”

Padrão recomendado:
- Featured image: `set_post_thumbnail`
- Top image: inserir no início do content (primeiro parágrafo) com `<figure>`.

Exemplo:
```html
<figure class="aw-top-image">
  <img src="{url}" alt="{alt}" loading="lazy" />
</figure>
```

## 17.6 Download e upload de imagens (seguro)

### Regras SSRF (obrigatório)
Ao baixar uma imagem por URL (manual ou gerada externamente):

1) aceitar apenas `https://`
2) bloquear:
- IPs privados (10/8, 172.16/12, 192.168/16)
- localhost (127.0.0.1)
- link-local (169.254/16)
- IPv6 local
3) resolver DNS e validar o IP
4) limitar tamanho de download (ex.: 10MB)
5) validar Content-Type (image/jpeg|png|webp)

### Implementação
- use `wp_safe_remote_get` com timeout
- valide headers e tamanho
- armazene em arquivo temporário
- use `media_handle_sideload` para criar attachment

## 17.7 Integração SEO (Yoast / RankMath)

### 17.7.1 Meta Description

**Yoast:**
- post meta: `_yoast_wpseo_metadesc`

**RankMath:**
- post meta: `rank_math_description`

### 17.7.2 Focus keyword (opcional)

**Yoast:** `_yoast_wpseo_focuskw`
**RankMath:** `rank_math_focus_keyword`

### 17.7.3 Meta title (opcional)

**Yoast:** `_yoast_wpseo_title`
**RankMath:** `rank_math_title`

## 17.8 Sanitização do HTML do artigo

Mesmo vindo do Dashboard:
- sanitize server-side no WP, usando `wp_kses` com allowlist controlada.

Allowlist típica:
- p, a (href), ul, ol, li
- h2, h3, strong, em
- blockquote
- figure, img (src, alt, loading)

Remover:
- script, iframe, on* handlers

## 17.9 Logs e auditoria

- gravar em `autowriter_logs`:
  - job_id, level, message, meta
- gravar em `autowriter_jobs`:
  - status, post_id, payload_hash

## 17.10 Retornos do endpoint

Retornar JSON:
- `job_id`
- `post_id`
- `post_url`
- `status`
- `warnings[]` (ex.: categoria criada, slug alterado)

---

## 17.11 Checklist de Aceite (Plugin)

- [ ] Multisite: switch_to_blog/restored corretamente
- [ ] Idempotência impede duplicação
- [ ] Draft criado com title/slug/content/excerpt
- [ ] Categoria aplicada
- [ ] Tags aplicadas
- [ ] Featured image anexada
- [ ] Top image inserida no início
- [ ] SEO meta aplicado (Yoast/RankMath)
- [ ] HTML sanitizado
- [ ] SSRF mitigado para URLs
- [ ] Logs gravados

---

**Status:** Passos 15–17 finalizados em um pacote único, pronto para implementação pelo time.

