# AutoWriter Multisite – Especificação Técnica do Plugin WordPress

## 1. Objetivo do Plugin

O plugin **AutoWriter** atua como **camada de publicação** dentro do WordPress Multisite.

Ele **não gera texto nem imagens**. Ele recebe um **payload pronto** do Dashboard Central e executa:

- criação de posts como **Draft**
- criação/associação de categorias
- upload/associação de imagens (geradas externamente ou via URL manual)
- preenchimento de metadados SEO (Yoast/RankMath)
- logs e auditoria (jobs)

---

## 2. Requisitos

### 2.1 Compatibilidade

- WordPress 6.x+
- PHP 8.1+ (recomendado 8.2)
- Multisite ativado
- Network activation obrigatório

### 2.2 Restrições e princípios

- Sem chamadas a LLM dentro do WP
- Sem long running tasks: tudo orientado a payload final
- Processamento idempotente (reenvios não duplicam posts)

---

## 3. Estrutura de Pastas (plugin)

```
/wp-content/plugins/autowriter/
├── autowriter.php
├── readme.txt
├── composer.json (opcional)
├── /includes/
│   ├── class-autowriter-bootstrap.php
│   ├── class-autowriter-admin-network.php
│   ├── class-autowriter-rest.php
│   ├── class-autowriter-jobs.php
│   ├── class-autowriter-wp-posts.php
│   ├── class-autowriter-media.php
│   ├── class-autowriter-seo.php
│   ├── class-autowriter-security.php
│   └── class-autowriter-utils.php
├── /assets/
│   └── admin.css
└── /migrations/
    └── schema.sql
```

---

## 4. Configuração (Network Admin)

O plugin deve expor uma página no **Network Admin**:

- **Dashboard URL (allowlist)**: URL base do orquestrador autorizado
- **Auth Mode**:
  - `application_password`
  - `application_password + hmac_signature` (recomendado)
- **HMAC Secret** (se ativado)
- **Default author** (fallback)
- **Default post status** (default: `draft`)
- **Imagem**:
  - `external_generated` (default)
  - `manual_url_allowed`
  - `mixed`
- **SEO Provider** (auto-detect + override):
  - `yoast` | `rankmath` | `none`
- **Rate limit** (requests/min)
- **Logging level** (info|debug)

> As opções devem ser armazenadas em `wp_sitemeta` via `get_site_option()` / `update_site_option()`.

---

## 5. Persistência (Tabelas Customizadas)

### 5.1 Tabela de Jobs

**Nome:** `{$wpdb->base_prefix}autowriter_jobs`

Campos recomendados:

- `id` (BIGINT, PK)
- `external_job_id` (VARCHAR) — ID do Dashboard
- `blog_id` (BIGINT)
- `status` (VARCHAR) — `pending|running|needs_review|failed|done`
- `step` (VARCHAR) — ex: `payload_received|post_created|media_uploaded|seo_applied|completed`
- `idempotency_key` (VARCHAR, UNIQUE)
- `post_id` (BIGINT, nullable)
- `payload_hash` (CHAR(64))
- `error_code` (VARCHAR, nullable)
- `error_message` (TEXT, nullable)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

Índices:
- UNIQUE(`idempotency_key`)
- INDEX(`blog_id`, `status`)
- INDEX(`external_job_id`)

### 5.2 Tabela de Logs

**Nome:** `{$wpdb->base_prefix}autowriter_logs`

- `id` (BIGINT, PK)
- `job_id` (BIGINT, FK)
- `level` (VARCHAR) — info|warn|error|debug
- `message` (TEXT)
- `context_json` (LONGTEXT) — JSON
- `created_at` (DATETIME)

---

## 6. REST API – Endpoints do Plugin

### 6.1 Namespace

- `autowriter/v1`

### 6.2 Endpoints

#### POST `/wp-json/autowriter/v1/jobs`
Cria um job e publica o draft.

- Auth: Application Password + (opcional) HMAC
- Rate limited
- Retorno: `{ job_id, status, post_id }`

#### GET `/wp-json/autowriter/v1/jobs/{id}`
Obtém status detalhado.

#### POST `/wp-json/autowriter/v1/jobs/{id}/retry`
Reexecuta etapas idempotentes (dependendo do status).

#### GET `/wp-json/autowriter/v1/health`
Retorna diagnóstico:
- multisite ok
- permissões
- SEO provider detectado
- capacidade de upload

---

## 7. Segurança

### 7.1 Auth

Recomendação: **dupla camada**

1) **Application Password** (WP) para autenticação HTTP Basic
2) **HMAC Signature** para validação de payload

#### HMAC (recomendado)
Headers:
- `X-AW-Timestamp`
- `X-AW-Signature` = HMAC_SHA256(secret, timestamp + body)

Regras:
- timestamp com janela de 5 minutos
- comparação segura

### 7.2 Allowlist do Dashboard

- Validar `Origin`/`Referer` quando aplicável
- (Opcional) allowlist por IP

### 7.3 Capabilities

- Endpoints só devem permitir execução por usuário com `manage_network` (ou um usuário de automação dedicado)

---

## 8. Payload Contract (o que o WP recebe)

### 8.1 Estrutura (JSON)

```json
{
  "external_job_id": "CJ-2025-0000123",
  "idempotency_key": "hash(csv_row + blog_id + version)",
  "blog_id": 3,
  "author": {"id": 12},
  "post": {
    "status": "draft",
    "title": "...",
    "slug": "...",
    "excerpt": "...",
    "content_html": "<p>...</p>",
    "date_gmt": null,
    "categories": ["Viagem", "Chile"],
    "tags": ["...", "..."]
  },
  "seo": {
    "provider": "auto",
    "focus_keyword": "...",
    "meta_title": "...",
    "meta_description": "...",
    "schema": {"type": "Article", "faq": []}
  },
  "images": {
    "mode": "mixed",
    "featured": {
      "source": "generated|url",
      "url": "https://.../image.webp",
      "alt": "...",
      "title": "...",
      "caption": "..."
    },
    "top": {
      "source": "generated|url",
      "url": "https://.../top.webp",
      "alt": "...",
      "title": "...",
      "caption": "..."
    }
  },
  "backups": {
    "markdown_url": "https://.../post.md",
    "json_url": "https://.../payload.json"
  },
  "quality": {
    "word_count": 1023,
    "language": "en",
    "checks": {"passed": true, "notes": []}
  }
}
```

### 8.2 Regras

- `idempotency_key` é obrigatório
- `blog_id` obrigatório
- `content_html` deve estar pronto (Gutenberg blocks opcional)
- `categories` pode vir como nomes; plugin resolve/cria dependendo de regra

---

## 9. Fluxo Interno de Execução (Create Job)

1) Validar auth + assinatura
2) Criar registro de job (`pending`)
3) `switch_to_blog(blog_id)`
4) Resolver autor
5) Resolver categorias/tags
6) Criar Post `draft`
7) Processar imagens:
   - se `source=url`: baixar e inserir na Media Library
   - se `source=generated`: baixar e inserir na Media Library
   - set featured image
   - inserir imagem do topo no início do conteúdo
8) Aplicar SEO
9) Atualizar job para `done`
10) Registrar logs e retorno

---

## 10. Media Handling

### 10.1 Download e Upload

- Validar mime e tamanho
- Download via `wp_safe_remote_get`
- Salvar via `wp_upload_bits`
- Criar attachment via `wp_insert_attachment`
- Gerar metadata via `wp_generate_attachment_metadata`

### 10.2 WebP

O ideal é o Dashboard já fornecer WebP.

Fallback (se necessário):
- Se servidor suportar conversão, converter.
- Caso contrário, aceitar formato original.

### 10.3 Inserção da Top Image no Conteúdo

Preferencial:
- Inserir bloco Gutenberg `core/image`.

Fallback:
- Inserir HTML `<figure class="wp-block-image">...</figure>` no topo.

---

## 11. Integração com SEO Plugins

### 11.1 Yoast

- Campos principais via postmeta:
  - `_yoast_wpseo_title`
  - `_yoast_wpseo_metadesc`
  - `_yoast_wpseo_focuskw`

### 11.2 RankMath

- Campos principais via postmeta:
  - `rank_math_title`
  - `rank_math_description`
  - `rank_math_focus_keyword`

### 11.3 Auto-detect

- Checar classes/funções do plugin instalado
- Permitir override nas opções

---

## 12. Network Admin UI

### 12.1 Tela de Configurações

Seções:
- Autenticação
- Segurança
- SEO
- Imagens
- Logs

### 12.2 Tela de Monitoramento

- Lista de jobs (filtrável por blog/status)
- Acesso ao post criado
- Botão de retry
- Visualização de logs

---

## 13. Observabilidade e Auditoria

- Log por job com contexto
- Hash de payload armazenado
- Salvar URLs de backups (gerados externamente)

---

## 14. Checklist de Implementação (Plugin)

- [ ] Bootstrap + activation hooks
- [ ] Schema migrations
- [ ] Settings (network)
- [ ] REST endpoints
- [ ] Jobs engine (idempotência)
- [ ] Posts + taxonomy
- [ ] Media handler
- [ ] SEO handler (Yoast/RankMath)
- [ ] Monitor UI
- [ ] Security (HMAC)
- [ ] Testes básicos em Multisite

---

**Status:** Especificação técnica completa do plugin para implementação.

