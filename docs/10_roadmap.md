# AutoWriter Multisite – Roadmap (MVP → v1.x)

## 1. Objetivo

Planejar entregas incrementais para colocar o AutoWriter em produção rapidamente, com base robusta para evolução sem retrabalho.

---

## 2. Fase 0 – Preparação (1–3 dias)

### Entregáveis
- Repositório do projeto (plugin + dashboard)
- Infra básica do Dashboard (env, db, queue)
- Usuário `autowriter-bot` no WP + Application Password
- Definição do mapeamento `blog_key → blog_id`

### Critérios de aceite
- Dashboard autentica
- Dashboard consegue chamar endpoint health do plugin

---

## 3. Fase 1 – MVP (produção controlada)

### Escopo MVP (obrigatório)

**Dashboard**
- Upload CSV + preview
- Validação schema
- Jobs + queue + retries
- Pipeline IA (T0–T6 + T10)
- Keywords API integrada
- Geração externa de imagens (2 por artigo)
- Suporte a URL manual de imagem (featured/top)
- Backups: payload.json + post.md + audit.json
- Publicação draft via REST no WP

**Plugin WP**
- Endpoint `/autowriter/v1/jobs`
- Criação de post draft
- Categorias/tags
- Upload media + featured + top image
- Integração SEO (Yoast/RankMath)
- Tabelas `autowriter_jobs` e `autowriter_logs`

**Segurança**
- Application Password + HMAC
- Rate limiting
- SSRF protection

### Critérios de aceite (MVP)
- Processar 50 linhas com:
  - ≥ 95% drafts criados sem intervenção
  - falhas vão para `needs_review`
- Fallback de LLM funcional (ao menos 1 modelo secundário)
- Reprocessar imagens de um job sem duplicar post
- Backups recuperáveis

---

## 4. Fase 1.1 – Qualidade e Consistência

### Entregáveis

- Presets por blog:
  - tom de voz
  - CTA padrão
  - blacklist terms
  - preset visual de imagens

- Internal linking automático (`internal_links=auto`)
- FAQ opcional + schema
- Quality Gate expandido:
  - repetição
  - idioma
  - SEO sanity

- UI de monitoramento mais forte:
  - timeline por job
  - rerun por step

### Critérios de aceite
- Presets aplicados automaticamente em 3 blogs
- Internal links inseridos em drafts
- Jobs rerun por step funcionando

---

## 5. Fase 1.2 – Operação Editorial

### Entregáveis

- Scheduling de publicação (future)
- Template por categoria
- A/B title suggestions (não publicar automático)
- Export ZIP por batch
- Relatórios:
  - custo por blog
  - taxa de falhas por provider

### Critérios de aceite
- Agendar 20 posts em 3 blogs
- Export batch zip funcional

---

## 6. Fase 1.3 – Performance e Escala

### Entregáveis

- Paralelismo controlado por blog
- Rate management adaptativo
- Cache de keywords e image prompts
- Otimização de custos (roteamento por tarefa)

### Critérios de aceite
- Processar 300 linhas/dia com estabilidade
- Custos previsíveis

---

## 7. Fase 2.0 – Inteligência e Insights (opcional)

### Ideias

- GA/GSC integration
- Sugestões automáticas de atualização de posts antigos
- “Content gap analysis” por blog
- Priorizar temas com base em trends

---

## 8. Tarefas Técnicas (Backlog)

### Plugin
- [ ] Hook para injetar JSON-LD se SEO provider = none
- [ ] Melhorar UI de jobs no Network Admin
- [ ] Suporte a custom post types (futuro)

### Dashboard
- [ ] Painel de presets por blog
- [ ] Biblioteca de prompts versionados
- [ ] LLM Strategy file (lista + fallback)

---

**Status:** Roadmap completo do MVP até v2.0.

