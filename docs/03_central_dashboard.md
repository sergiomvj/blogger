# AutoWriter Multisite – PRD Técnico do Dashboard Central

## 1. Objetivo

O **Dashboard Central** é a camada de **orquestração e processamento** do AutoWriter.

Ele recebe o CSV (em português), executa o pipeline completo (IA + SEO + imagens + qualidade) e envia um **payload final** ao WordPress Multisite para criação do post como Draft.

**Princípio-chave:** WordPress não faz geração pesada. O Dashboard faz tudo e o WP apenas publica.

---

## 2. Escopo

### 2.1 Incluído

- Upload/gestão de CSV
- Validação + normalização
- Fila de jobs + retries
- Abstração de LLM (multi-provider + fallback)
- Integração com API de keywords
- Geração de imagens via API externa
- Backup (JSON/MD) por artigo
- Publicação no WP via REST (posts + media + categories)
- Painel de monitoramento e custos

### 2.2 Fora do escopo (por enquanto)

- Agendamento editorial por calendário
- A/B testing de títulos
- Publicação automática (não-draft)
- Integração com GA/GSC

---

## 3. Personas e Usuários

- **Admin Operador**: sobe CSV, acompanha jobs, corrige falhas
- **Editor Revisor**: checa drafts em WP e aprova
- **Sistema**: executa jobs, gera conteúdo, registra logs

---

## 4. Requisitos Funcionais

### RF-01 – Upload e parsing do CSV
- Upload via UI
- Parse robusto (CSV/UTF-8)
- Preview das linhas
- Detecção de colunas obrigatórias

### RF-02 – Validação e normalização
- Validar:
  - blog/site alvo
  - category
  - word_count (500|1000|2000)
  - language (ISO-2)
- Normalizar:
  - trimming
  - slugify
  - campos default

### RF-03 – Gestão de jobs
- Criar job por linha do CSV
- Estados:
  - `pending` `running` `needs_review` `failed` `done`
- Retry manual por job
- Retry automático com backoff
- Retomada por etapa

### RF-04 – Pipeline de IA
- Pipeline completo por job (ver seção 7)
- Suporte multi-idioma
- Input PT → output idioma escolhido

### RF-05 – Keywords API
- Chamar API externa para:
  - primary keyword
  - secondary keywords
  - LSI / related queries
  - clusterização

### RF-06 – Imagens
- Gerar 2 imagens via API externa (default)
- Alternativa: usar URL manual (CSV ou UI)
- Upload para WP Media via REST
- Salvar alt/title/caption

### RF-07 – Publicação no WordPress
- Enviar payload final ao WP via REST endpoint do plugin
- Direcionar por `blog_id`
- Receber `post_id` e armazenar vínculo

### RF-08 – Backups
- Gerar e armazenar:
  - `payload.json`
  - `post.md` (versão editorial)
  - `audit.json` (checks + custos + modelos)
- Opção de exportar pacote ZIP por CSV

### RF-09 – Observabilidade
- Logs por job
- Métricas:
  - tempo por etapa
  - custo estimado por etapa
  - taxa de falhas
  - top erros

---

## 5. Requisitos Não Funcionais

- Resiliência a falhas de rede
- Processamento assíncrono
- Idempotência
- Segurança por chave + assinatura
- Escalável (N jobs simultâneos)

---

## 6. Stack Recomendada (Opções)

### Opção A – PHP (simples e direto)
- PHP 8.2 + Laravel (ou Slim)
- Redis para queue
- MySQL/Postgres

### Opção B – Node.js (bom para filas e integrações)
- Node 20 + NestJS
- Redis (BullMQ)
- Postgres

### Opção C – Python (bom para pipelines)
- FastAPI
- Celery + Redis
- Postgres

**Recomendação geral:** Node.js + BullMQ + Postgres.

---

## 7. Pipeline de Conteúdo (Etapas)

Cada job executa as etapas abaixo, com checkpoints:

### Step 0 – Preparação
- Carregar linha do CSV
- Preparar `idempotency_key`
- Traduzir semanticamente o input para idioma alvo (somente para guiar geração)

### Step 1 – Outline (H2/H3)
- Gerar tópicos e sub-tópicos
- Produzir estrutura hierárquica

### Step 2 – Keywords (API)
- Buscar keywords e clusters
- Gerar plano de inserção

### Step 3 – Meta description (≈150 palavras)
- Em idioma final
- Otimizada e natural

### Step 4 – Title SEO
- 55–65 chars (preferência)
- Com keyword principal

### Step 5 – Headings SEO
- H2/H3 com variações
- Evitar repetição literal

### Step 6 – Article Body
- Gerar HTML (ou Markdown + conversão)
- Inserir:
  - intro
  - H2/H3
  - bullet lists
  - FAQ (opcional)
  - CTA

### Step 7 – Image Prompts
- Gerar prompts para:
  - Top image
  - Featured image
- Incluir alt text sugerido

### Step 8 – Image Generation / Resolve URLs
- Se CSV tiver URL manual, usar
- Caso contrário, chamar API de imagem
- Armazenar URLs finais

### Step 9 – Quality Gate
- Contagem de palavras
- Idioma correto
- Repetição
- Estrutura H2/H3
- Checagem de risco (claims sensíveis)

### Step 10 – Publish (Draft)
- Montar payload final
- POST no endpoint do plugin
- Receber `post_id`

---

## 8. Abstração de LLM (Multi-provider + Fallback)

### 8.1 Objetivo
Permitir trocar LLMs sem reescrever pipeline, com:

- lista ordenada de providers
- fallback automático
- roteamento por tarefa

### 8.2 Modelo de Router

Interface sugerida:

```ts
LLMRouter.generate({
  task: "outline" | "seo_title" | "article_body" | "image_prompt",
  input: {...},
  language: "en",
  quality: "high" | "balanced" | "low_cost",
  max_tokens: 4000,
  fallback: true
})
```

### 8.3 Regras de Fallback

- Falha por timeout → próximo provider
- Falha por conteúdo inválido → retry 1x, depois fallback
- Se custo exceder limite → mover para provider econômico

### 8.4 Versionamento

- Cada execução salva:
  - provider
  - model
  - prompt_version
  - tokens
  - custo estimado

---

## 9. API do Dashboard (Interna)

### Endpoints principais

- `POST /csv/upload`
- `GET /csv/{id}/preview`
- `POST /jobs/create-from-csv/{id}`
- `GET /jobs?status=...&blog_id=...`
- `GET /jobs/{id}`
- `POST /jobs/{id}/retry`
- `POST /jobs/{id}/cancel`
- `GET /metrics/summary`

---

## 10. Banco de Dados (Dashboard)

### Tabela: `csv_batches`
- id
- filename
- uploaded_by
- status
- created_at

### Tabela: `jobs`
- id
- batch_id
- blog_id
- status
- step
- idempotency_key
- payload_json
- costs_json
- error_message
- created_at
- updated_at

### Tabela: `artifacts`
- id
- job_id
- type (payload|markdown|audit|image)
- url
- created_at

---

## 11. UI/UX do Dashboard

### Telas

1. Login
2. Upload CSV + Preview
3. Batch detail (lista de jobs)
4. Job detail (timeline steps + artifacts)
5. Monitor (falhas, retries)
6. Costs & usage

### Componentes úteis

- Timeline visual por job
- Botões: retry, skip images, re-run seo
- Export: ZIP do batch

---

## 12. Segurança

- Autenticação do Dashboard (JWT/session)
- Chaves dos providers em vault/env
- HMAC secret compartilhado com WP
- Rate limits
- Logs imutáveis

---

## 13. Critérios de Aceite (MVP)

- CSV com 100 linhas processa sem travar
- Posts criados em Draft no blog correto
- Pelo menos 1 fallback funcional de LLM
- Imagem externa gerada e anexada
- URL manual funciona e sobrescreve geração
- Backups gerados e recuperáveis
- Jobs com retry por etapa

---

## 14. Roadmap do Dashboard

### MVP
- Upload CSV
- Pipeline completo
- Publish draft

### v1.1
- Presets por blog (tom, CTA, blacklist)
- Internal linking

### v1.2
- Scheduling
- A/B titles
- Report SEO

---

**Status:** PRD técnico do Dashboard pronto para implementação.

