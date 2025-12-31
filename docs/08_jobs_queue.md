# AutoWriter Multisite – Jobs, Filas, Retomada e Idempotência

## 1. Objetivo

Definir o sistema de jobs para processar grandes volumes de artigos com alta confiabilidade, evitando duplicação e permitindo retomada granular.

O sistema envolve dois níveis:

1) **Dashboard Queue** (orquestração e processamento)
2) **WP Plugin Jobs** (publicação e auditoria)

---

## 2. Estados do Job (Dashboard)

Estados recomendados:

- `pending` – aguardando execução
- `running` – em execução
- `needs_review` – executou, mas exige revisão (ex: imagem falhou)
- `failed` – falha definitiva
- `done` – publicado como draft com sucesso
- `canceled` – cancelado manualmente

---

## 3. Steps (Checkpoints) do Pipeline

Cada job mantém o `step` atual (checkpoint) para permitir retomada.

Lista sugerida:

- `csv_parsed`
- `brief_created`
- `outline_created`
- `keywords_resolved`
- `meta_created`
- `title_slug_created`
- `headings_created`
- `content_created`
- `tags_created`
- `faq_created`
- `internal_links_created`
- `image_prompts_created`
- `images_resolved`
- `quality_gate_passed`
- `payload_ready`
- `published_wp`

Regras:
- Cada step deve salvar output parcial e artifacts
- Cada step deve ser reexecutável sem gerar duplicação

---

## 4. Idempotência

### 4.1 Idempotency Key (por artigo)

Gerar no Dashboard:

`idempotency_key = sha256(blog_id + theme + objective + language + word_count + pipeline_version)`

Isso garante:
- se a mesma linha for reenviada, não duplica
- se pipeline_version mudar, permite uma nova geração

### 4.2 Idempotência no WP

O plugin WP deve armazenar `idempotency_key` na tabela `autowriter_jobs` e recusar duplicatas.

Comportamentos:
- Se receber uma requisição com idempotency_key já finalizada → retornar job existente
- Se status anterior foi `failed` → permitir retry

### 4.3 Idempotência por imagem

`image_idempotency_key = sha256(job_id + image_type + prompt_hash)`

---

## 5. Retry Strategy (Dashboard)

### 5.1 Motivos de retry

- timeout provider
- resposta inválida (JSON quebrado)
- rate limits

### 5.2 Regras

- Retry automático: até 2 tentativas por step
- Backoff exponencial:
  - 1ª: 10s
  - 2ª: 30s
  - 3ª: 120s

Após esgotar retries:
- fallback para outro provider (LLM / imagem / keywords)

### 5.3 Retry manual

Operador pode:
- reexecutar step específico
- reexecutar do step X em diante

---

## 6. Reprocessamentos Granulares

Operações comuns:

- `rerun_images` (regera só imagens)
- `rerun_seo` (título/meta/headings)
- `rerun_body` (corpo)

Regra:
- cada operação incrementa `revision` do job

---

## 7. Sincronização Dashboard ↔ WordPress

### 7.1 Publicação

- Dashboard envia payload final ao endpoint do plugin
- Plugin responde com:
  - `post_id`
  - `job_id`
  - `status`

### 7.2 Webhook (opcional)

O plugin WP pode notificar o Dashboard:
- `POST /webhooks/wp-job-updated`

Eventos:
- media upload ok/fail
- seo applied
- done

---

## 8. Erros Padrão (Códigos)

### 8.1 Dashboard

- `CSV_INVALID`
- `BLOG_NOT_FOUND`
- `LLM_TIMEOUT`
- `LLM_INVALID_JSON`
- `KEYWORDS_API_FAIL`
- `IMAGE_API_FAIL`
- `QUALITY_GATE_FAIL`
- `WP_PUBLISH_FAIL`

### 8.2 Plugin WP

- `AUTH_FAILED`
- `HMAC_INVALID`
- `RATE_LIMIT`
- `BLOG_SWITCH_FAIL`
- `CATEGORY_CREATE_FAIL`
- `MEDIA_UPLOAD_FAIL`
- `SEO_APPLY_FAIL`
- `IDEMPOTENCY_DUPLICATE`

---

## 9. Observabilidade

### 9.1 Dados por job

- start_time / end_time
- duration por step
- providers usados
- tokens/custos
- artifacts gerados

### 9.2 Métricas

- throughput (jobs/h)
- failure rate
- retry rate
- custo médio por artigo

---

## 10. Regras de Status (needs_review)

O job deve ir para `needs_review` quando:

- imagem falhou, mas texto foi publicado
- idioma detectado não confere
- quality gate alertou risco

O draft pode existir, mas precisa revisão.

---

## 11. Checklist de Implementação

- [ ] Jobs DB no Dashboard
- [ ] Queue (Redis/DB)
- [ ] Step checkpoints
- [ ] Retry + backoff
- [ ] Fallback provider
- [ ] Idempotência artigo/imagem
- [ ] Sync WP
- [ ] UI para reruns

---

**Status:** Sistema de jobs definido e pronto para implementação.

