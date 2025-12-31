# AutoWriter Multisite – Blueprint Técnico & PRD

Este documento consolida **Blueprint Técnico** e **PRD detalhado** do sistema de criação automática de artigos para WordPress Multisite, com geração de conteúdo e imagens externas, seguindo CSV como fonte de verdade.

---

## 📁 Estrutura de Arquivos (Markdown)

```
/autowriter-docs
├── 00_OVERVIEW.md
├── 01_ARCHITECTURE.md
├── 02_WORDPRESS_PLUGIN.md
├── 03_CENTRAL_DASHBOARD.md
├── 04_CSV_SCHEMA.md
├── 05_AI_PIPELINE.md
├── 06_IMAGE_PIPELINE.md
├── 07_SEO_INTEGRATION.md
├── 08_JOBS_QUEUE.md
├── 09_SECURITY_GOVERNANCE.md
├── 10_ROADMAP.md
```

---

# 00_OVERVIEW.md

## Visão Geral

O **AutoWriter Multisite** é um sistema proprietário para geração automatizada de artigos SEO-ready em múltiplos blogs WordPress organizados em **WordPress Multisite**.

- Entrada via **CSV em português**
- Processamento via **LLM + APIs externas**
- Geração de **texto, SEO e imagens**
- Publicação como **Draft**
- Auditoria, backup e rastreabilidade completos

---

# 01_ARCHITECTURE.md

## Arquitetura Geral

### Componentes

1. **Plugin WordPress (Network Activated)**
   - Executa dentro do Multisite
   - Cria posts, mídia, taxonomias
   - Gerencia jobs locais

2. **Dashboard Central (PHP/Node/Python)**
   - Upload e validação do CSV
   - Orquestra pipelines de IA
   - Gera imagens
   - Envia payloads prontos ao WP

3. **Serviços Externos**
   - LLM (texto)
   - API de keywords
   - API de geração de imagens

### Comunicação

- Dashboard → WP via **REST API autenticada**
- Upload de mídia via `/wp/v2/media`
- Posts via `/wp/v2/posts`

---

# 02_WORDPRESS_PLUGIN.md

## Plugin WordPress Multisite

### Responsabilidades

- Receber payloads prontos do Dashboard
- Criar:
  - Post (Draft)
  - Categoria
  - Metadados SEO
  - Featured Image
- Associar imagens externas via URL (opcional)
- Registrar logs e status

### Tabelas Customizadas

```sql
wp_autowriter_jobs
- id
- blog_id
- status (pending|done|failed|needs_review)
- step
- created_at
- updated_at

wp_autowriter_logs
- id
- job_id
- level
- message
- payload_hash
- created_at
```

### Configurações (Network Admin)

- API Key (texto)
- API Key (imagens)
- Modo imagem: `external | manual_url | mixed`
- Plugins SEO ativos

---

# 03_CENTRAL_DASHBOARD.md

## Dashboard Central

### Funções

- Upload CSV
- Validação e normalização
- Execução do pipeline IA
- Geração de imagens
- Retry e retomada
- Visualização de custos

### Stack Sugerida

- Backend: PHP 8.2 / Node.js / Python
- Storage: Local + S3-compatible
- Queue: Redis / DB

---

# 04_CSV_SCHEMA.md

## Estrutura do CSV

```csv
blog,category,objective,theme,word_count,language,image_url(optional)
blog1,SEO,Gerar leads,Marketing para SaaS,1000,en,
blog2,Viagem,Inspirar,Roteiros no Chile,2000,pt,https://...
```

### Regras

- `word_count`: 500 | 1000 | 2000
- `language`: ISO-2
- `image_url`: opcional (substitui geração)

---

# 05_AI_PIPELINE.md

## Pipeline de Conteúdo

### Etapas

1. Tradução semântica do input (PT → idioma alvo)
2. Outline (H2/H3)
3. Keyword clustering (API externa)
4. Meta description (150 palavras)
5. Title SEO
6. Subtitles SEO
7. Corpo do texto
8. Checklist de qualidade

### Quality Gate

- Contagem de palavras
- Repetição
- Estrutura HTML
- Idioma correto

---

# 06_IMAGE_PIPELINE.md

## Pipeline de Imagens

### Modos

1. **API externa (default)**
2. **URL manual (CSV ou UI)**
3. **Fallback: sem imagem**

### Imagens Geradas

- Top Image (conteúdo)
- Featured Image (indexação)

### Metadados

- Alt text SEO
- Filename otimizado
- WebP

---

# 07_SEO_INTEGRATION.md

## Integração SEO

### Plugins

- Yoast
- RankMath

### Campos

- meta_title
- meta_description
- focus_keyword
- schema básico

---

# 08_JOBS_QUEUE.md

## Sistema de Jobs

### Estados

- pending
- running
- failed
- needs_review
- done

### Retomada

- Por etapa
- Por artigo

---

# 09_SECURITY_GOVERNANCE.md

## Segurança

- API Keys criptografadas
- Nonce + Auth REST
- Rate limit
- Logs imutáveis

---

# 10_ROADMAP.md

## Roadmap

### Fase 1 – MVP
- CSV → Draft
- Texto + imagens

### Fase 2
- Internal linking
- Personas por blog
- CTA dinâmico

### Fase 3
- Multi-idioma automático
- Versionamento de prompts
- Analytics SEO

---

## Status

Documento pronto para implementação técnica e divisão de tarefas.

