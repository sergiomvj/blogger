# AutoWriter Multisite – Estratégia de LLMs (Multi‑Provider, Fallback e Custos)

## 1. Objetivo

Definir uma **camada de abstração de LLM** que permita:
- usar múltiplos provedores simultaneamente
- aplicar fallback automático
- rotear modelos por tarefa (outline ≠ body ≠ SEO)
- controlar custo, qualidade e latência
- trocar modelos sem reescrever o pipeline

Este arquivo foi criado **LLM‑agnostic**. A lista final de modelos pode ser ajustada a qualquer momento.

---

## 2. Princípios de Design

1. **Nenhum modelo é hard‑coded no pipeline**
2. Toda chamada passa pelo `LLMRouter`
3. Cada tarefa pode ter prioridades diferentes (qualidade vs custo)
4. Fallback é obrigatório
5. Tudo é versionado e auditável

---

## 3. Categorias de Tarefa (Task Types)

O sistema reconhece as seguintes categorias:

- `semantic_brief`
- `outline`
- `keyword_plan`
- `seo_meta`
- `seo_title`
- `headings`
- `article_body`
- `tags`
- `faq`
- `internal_links`
- `image_prompt`

Cada categoria pode ter **modelos diferentes**.

---

## 4. Interface do Router (Contrato)

```ts
LLMRouter.generate({
  task: TaskType,
  input: object,
  language: "pt" | "en" | "es",
  quality: "high" | "balanced" | "low_cost",
  max_tokens: number,
  timeout_ms: number,
  allow_fallback: true
})
```

Retorno:

```json
{
  "content": {...},
  "provider": "...",
  "model": "...",
  "prompt_version": "...",
  "tokens": {
    "input": 0,
    "output": 0
  },
  "estimated_cost": 0.0
}
```

---

## 5. Estratégia de Roteamento por Qualidade

### 5.1 `high`

Usado para:
- `article_body`
- `semantic_brief`

Critérios:
- melhor coerência
- menor repetição
- melhor escrita longa

### 5.2 `balanced`

Usado para:
- `outline`
- `headings`
- `faq`

Critérios:
- boa qualidade
- custo médio

### 5.3 `low_cost`

Usado para:
- `seo_title`
- `seo_meta`
- `tags`
- `image_prompt`

Critérios:
- baixo custo
- respostas curtas

---

## 6. Exemplo de Configuração (Placeholder)

> ⚠️ **Os modelos abaixo são exemplos e podem ser substituídos**

```json
{
  "semantic_brief": [
    {"provider": "LLM_A", "model": "model-x", "priority": 1},
    {"provider": "LLM_B", "model": "model-y", "priority": 2}
  ],
  "article_body": [
    {"provider": "LLM_A", "model": "model-x", "priority": 1},
    {"provider": "LLM_C", "model": "model-z", "priority": 2}
  ],
  "seo_title": [
    {"provider": "LLM_B", "model": "model-y", "priority": 1},
    {"provider": "LLM_C", "model": "model-z", "priority": 2}
  ]
}
```

---

## 7. Regras de Fallback

Fallback ocorre quando:

- timeout
- erro de API
- resposta inválida (JSON quebrado)
- custo estimado > limite

Fluxo:

1. tentar provider prioridade 1
2. retry 1x
3. fallback para prioridade 2
4. registrar evento

Se todos falharem → job = `failed`

---

## 8. Guardrails de Custo

### 8.1 Limites

- custo máximo por artigo (configurável)
- custo máximo por task

Exemplo:

```json
{
  "max_cost_per_article": 0.80,
  "max_cost_per_task": {
    "article_body": 0.40,
    "semantic_brief": 0.10
  }
}
```

### 8.2 Comportamento

- Se exceder limite da task → fallback para modelo mais barato
- Se exceder limite do artigo → abortar job (`failed_budget`)

---

## 9. Versionamento de Prompts e Modelos

Registrar em `audit.json`:

- task
- provider
- model
- prompt_version
- tokens input/output
- custo estimado

Isso permite:
- comparar modelos
- auditar gastos
- trocar providers com segurança

---

## 10. Observabilidade Específica de LLM

Métricas recomendadas:

- custo médio por task
- custo médio por artigo
- taxa de fallback por provider
- latência média
- taxa de erro

---

## 11. Política de Substituição de Modelos

Trocar um modelo **não exige**:
- mudar prompts
- mudar pipeline
- mudar WP plugin

Apenas:
- atualizar config do router

---

## 12. Próximo Passo (Configuração Final)

Para fechar esta estratégia, basta definir:

1. Lista real de providers
2. Modelos por tarefa
3. Ordem de prioridade
4. Limite de custo desejado

Com isso, este arquivo pode ser atualizado sem impacto estrutural.

---

## 13. Lista Inicial (FREE) via OpenRouter – Classificação e Uso Recomendado

> A lista abaixo é adequada para o **MVP** (priorizar qualidade, mas com fallback). Em produção, a “qualidade real” por tarefa deve ser confirmada por benchmark interno (ver Seção 17).

### 13.1 Classificação rápida (por perfil)

**A) Long-form / escrita geral (artigos, conteúdo, tom consistente)**
- `meta-llama/llama-3.3-70b-instruct:free`
- `moonshotai/kimi-k2:free`
- `xiaomi/mimo-v2-flash:free`

**B) Reasoning / validação / decisões (quality gate, checagens, consistência)**
- `deepseek/deepseek-r1-0528:free`
- `allenai/olmo-3.1-32b-think:free`
- `z-ai/glm-4.5-air:free`

**C) SEO / metas rápidas / tarefas curtas**
- `google/gemini-2.0-flash-exp:free`
- `openai/gpt-oss-20b:free`
- `nvidia/nemotron-3-nano-30b-a3b:free`

**D) Code/Dev (geração de código, funções, refactor, tool-use)**
- `qwen/qwen3-coder:free`
- `mistralai/devstral-2512:free`
- `nex-agi/deepseek-v3.1-nex-n1:free`

**E) Multimodal (futuro)**
- `nvidia/nemotron-nano-12b-v2-vl:free`

---

## 14. Roteamento Inicial por Tarefa (somente FREE)

> Meta: consistência + previsibilidade. Tudo tem fallback.

- `article_body`:
  1) `meta-llama/llama-3.3-70b-instruct:free`
  2) `moonshotai/kimi-k2:free`
  3) `xiaomi/mimo-v2-flash:free`

- `outline` / `headings`:
  1) `moonshotai/kimi-k2:free`
  2) `allenai/olmo-3.1-32b-think:free`
  3) `meta-llama/llama-3.3-70b-instruct:free`

- `keyword_plan` / `seo_meta` / `seo_title` / `tags` / `image_prompt`:
  1) `google/gemini-2.0-flash-exp:free`
  2) `openai/gpt-oss-20b:free`
  3) `nvidia/nemotron-3-nano-30b-a3b:free`

- `quality_gate` / `audit`:
  1) `deepseek/deepseek-r1-0528:free`
  2) `allenai/olmo-3.1-32b-think:free`
  3) `z-ai/glm-4.5-air:free`

---

## 15. Config de Router (OpenRouter) – exemplo pronto para colar

```json
{
  "providers": {
    "openrouter": {
      "base_url": "https://openrouter.ai/api/v1",
      "auth": "Bearer ${OPENROUTER_API_KEY}",
      "headers": {
        "HTTP-Referer": "${APP_URL}",
        "X-Title": "${APP_NAME}"
      }
    }
  },
  "models": {
    "article_body": [
      {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free", "priority": 1},
      {"provider": "openrouter", "model": "moonshotai/kimi-k2:free", "priority": 2},
      {"provider": "openrouter", "model": "xiaomi/mimo-v2-flash:free", "priority": 3}
    ],
    "outline": [
      {"provider": "openrouter", "model": "moonshotai/kimi-k2:free", "priority": 1},
      {"provider": "openrouter", "model": "allenai/olmo-3.1-32b-think:free", "priority": 2},
      {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free", "priority": 3}
    ],
    "headings": [
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 1},
      {"provider": "openrouter", "model": "openai/gpt-oss-20b:free", "priority": 2},
      {"provider": "openrouter", "model": "moonshotai/kimi-k2:free", "priority": 3}
    ],
    "keyword_plan": [
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 1},
      {"provider": "openrouter", "model": "z-ai/glm-4.5-air:free", "priority": 2},
      {"provider": "openrouter", "model": "nvidia/nemotron-3-nano-30b-a3b:free", "priority": 3}
    ],
    "seo_meta": [
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 1},
      {"provider": "openrouter", "model": "openai/gpt-oss-20b:free", "priority": 2},
      {"provider": "openrouter", "model": "nvidia/nemotron-3-nano-30b-a3b:free", "priority": 3}
    ],
    "seo_title": [
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 1},
      {"provider": "openrouter", "model": "openai/gpt-oss-20b:free", "priority": 2},
      {"provider": "openrouter", "model": "nvidia/nemotron-3-nano-30b-a3b:free", "priority": 3}
    ],
    "tags": [
      {"provider": "openrouter", "model": "openai/gpt-oss-20b:free", "priority": 1},
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 2}
    ],
    "faq": [
      {"provider": "openrouter", "model": "moonshotai/kimi-k2:free", "priority": 1},
      {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free", "priority": 2},
      {"provider": "openrouter", "model": "z-ai/glm-4.5-air:free", "priority": 3}
    ],
    "internal_links": [
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 1},
      {"provider": "openrouter", "model": "openai/gpt-oss-20b:free", "priority": 2}
    ],
    "image_prompt": [
      {"provider": "openrouter", "model": "google/gemini-2.0-flash-exp:free", "priority": 1},
      {"provider": "openrouter", "model": "openai/gpt-oss-20b:free", "priority": 2}
    ],
    "quality_gate": [
      {"provider": "openrouter", "model": "deepseek/deepseek-r1-0528:free", "priority": 1},
      {"provider": "openrouter", "model": "allenai/olmo-3.1-32b-think:free", "priority": 2},
      {"provider": "openrouter", "model": "z-ai/glm-4.5-air:free", "priority": 3}
    ]
  }
}
```

---

## 16. Cadastro de Providers e Endpoints (escala para pagos)

### 16.1 `llm_providers`

- `provider_key` (ex.: openrouter)
- `base_url`
- `auth_type` (bearer)
- `headers_json`
- `is_enabled`

### 16.2 `llm_endpoints`

- `endpoint_key` (slug interno)
- `provider_key`
- `model_id` (ex.: `meta-llama/llama-3.3-70b-instruct:free`)
- `tier` (free/paid)
- `capabilities_json` (reasoning, coding, longform, structured)
- `max_context` (opcional)
- `notes`

---

## 17. Procedural Cost & Performance (sempre estruturado)

Você pediu um método **procedural** (seguro) para custos e performance. Aqui está o padrão que o Dashboard deve seguir.

### 17.1 Medição obrigatória por request

Salvar em `audit.json` / `llm_usage`:
- `provider`, `model`
- `task`
- `prompt_version`
- `input_tokens`, `output_tokens`
- `latency_ms`
- `fallback_used` (bool)
- `success` (bool)
- `estimated_cost_usd`

### 17.2 Estimativa de tokens por artigo (starter)

Enquanto você não mede, use um **modelo simples**:
- `output_tokens ≈ words / 0.75` (aprox. 1 token ≈ 0.75 palavra)
- `input_tokens ≈ overhead + k * output_tokens`

Parâmetros iniciais (ajustáveis):
- overhead = 2500 tokens (brief + system + formatos)
- k = 3.0 (porque o pipeline tem múltiplas chamadas)

### 17.3 Simulação de custo – “se tudo fosse feito só com 1 provider pago”

Abaixo é um exemplo objetivo (para comparação), assumindo:
- 500 palavras: `input=4000`, `output=667`
- 1000 palavras: `input=7000`, `output=1333`
- 2000 palavras: `input=13000`, `output=2667`
- e um multiplicador de pipeline **3.0** (outline+seo+body+checks)

**Preços (por 1M tokens) usados na simulação (qualidade máxima):**
- xAI: `grok-4` input $3.00 / output $15.00
- OpenAI: `gpt-5.2` input $3.50 / output $28.00
- Anthropic: `Claude Opus 4.5` input $5.00 / output $25.00
- Google Gemini (Developer API, <=200k): input $1.25 / output $10.00

**Estimativa (USD por artigo) – com multiplicador 3.0:**
- **500 palavras**
  - xAI: ~$0.066
  - OpenAI: ~$0.098
  - Anthropic: ~$0.110
  - Google: ~$0.035

- **1000 palavras**
  - xAI: ~$0.123
  - OpenAI: ~$0.185
  - Anthropic: ~$0.205
  - Google: ~$0.066

- **2000 palavras**
  - xAI: ~$0.237
  - OpenAI: ~$0.361
  - Anthropic: ~$0.395
  - Google: ~$0.129

> IMPORTANTE: isso é uma **simulação inicial** (não um orçamento). O valor real depende de quantas chamadas você faz, do tamanho do brief, e principalmente do tamanho do output intermediário (outline/keywords/seo).

### 17.4 Benchmark padronizado (procedural)

Rodar um “suite” em 30 artigos (10 por idioma PT/EN/ES), com as mesmas regras:
- 10 temas informacionais
- 10 comerciais
- 10 locais (destinos/cidades)

Métricas:
- custo por artigo
- latência total
- taxa de fallback
- score de qualidade (heurísticas + checklist)

### 17.5 Structured outputs sempre

Regra global:
- todas as etapas intermediárias retornam JSON validado por schema
- se JSON inválido → 1 retry com “repair prompt” → senão fallback

---

**Status:** Estratégia pronta: FREE via OpenRouter hoje; método procedural de custo/performance + simulação para provedores pagos já definido. 




## 15. Cost Analytics & What-if Pricing (por provedor)

Você pediu algo essencial para tomada de decisão: **cada artigo deve registrar tokens reais** (medidos) e, em cima disso, gerar uma **matriz de custo simulada** para diversos provedores (OpenAI, xAI/Grok, Anthropic, Google, etc.).

### 15.1 Conceito

- O Dashboard sempre registra **tokens reais por task** (input/output) do que aconteceu de verdade (via OpenRouter).
- Em seguida, o Dashboard calcula **quanto teria custado** se o mesmo trabalho fosse executado por **Provider X** (perfil de preço).
- Isso é “What-if pricing”: **o conteúdo não muda**, só o cálculo de custo.

> Mesmo com modelos FREE, você ganha a base: *tokens + latência + taxa de fallback* → custo simulado.

---

## 15.2 Estrutura de Dados (recomendado)

### Tabela: `llm_usage_events`
Registra cada chamada real à LLM (por task).

- `id`
- `job_id`
- `revision`
- `task`
- `provider_key` (ex.: openrouter)
- `model_id`
- `prompt_version`
- `input_tokens`
- `output_tokens`
- `latency_ms`
- `success`
- `fallback_used`
- `created_at`

### Tabela: `pricing_profiles`
Cadastro de “Provider X” e seus preços.

- `id`
- `profile_key` (ex.: `openai_gpt5_2`, `anthropic_opus`, `xai_grok4`, `google_gemini_pro`)
- `display_name`
- `currency` (USD)
- `input_per_1m_tokens`
- `output_per_1m_tokens`
- `notes`
- `is_active`

### Tabela: `job_cost_estimates`
Custo simulado por job, por profile.

- `id`
- `job_id`
- `revision`
- `profile_key`
- `estimated_cost_usd`
- `breakdown_json` (por task)
- `created_at`

---

## 15.3 Algoritmo de Cálculo

Para cada job, para cada `pricing_profile`:

1) Somar tokens por task:
- `total_input_tokens = Σ input_tokens`
- `total_output_tokens = Σ output_tokens`

2) Calcular custo:

- `cost_in = (total_input_tokens / 1_000_000) * input_per_1m_tokens`
- `cost_out = (total_output_tokens / 1_000_000) * output_per_1m_tokens`
- `estimated_cost = cost_in + cost_out`

3) Gerar breakdown por task (para explicar “onde gasta”).

> Evolução v1.1: suportar overrides por task/modelo (quando você misturar modelos pagos diferentes em tarefas diferentes).

---

## 15.4 UI/UX – Visualização de Custo

### Tela: Job Detail
Adicionar um card "**Costs**" com 3 blocos:

1) **Tokens reais (medidos)**
- total input/output
- latência total

2) **Custo real**
- (pode ser $0.00 no FREE)

3) **What-if pricing (simulado)**
- tabela com linhas (profiles): OpenAI / xAI / Anthropic / Google / etc.
- colunas:
  - input_tokens
  - output_tokens
  - estimated_cost
- drill-down: breakdown por task

### Tela: Batch Detail (lista de jobs)
- Coluna “Estimated cost (profile selecionado)”
- Dropdown no topo: `Simulate: <profile>`

---

## 15.5 Seleção com Checkmarks (custo de subconjunto)

### Requisito
Permitir o operador marcar N artigos e calcular:
- custo total simulado
- custo médio por artigo
- distribuição por tamanho (500/1000/2000)
- top tasks que mais consomem tokens

### UX sugerida

- Lista do batch com checkbox por linha
- Barra fixa ao selecionar:
  - **Calculate selected cost**
  - **Export selected report**

### Resultado (modal)
- Total cost (por profile)
- Custo por artigo (lista)
- Breakdown por task
- Export CSV/JSON

---

## 15.6 Endpoints do Dashboard (para UI)

- `GET /pricing-profiles`
- `POST /pricing-profiles` (admin)
- `GET /jobs/{id}/cost-estimates`
- `POST /jobs/{id}/cost-estimates/recompute`
- `POST /batches/{id}/cost-estimates/recompute` (gera para todos)
- `POST /batches/{id}/cost-estimates/selected`
  - body: `{ job_ids: [...], profile_keys: [...] }`

---

## 15.7 Critérios de Aceite (Costs)

- Cada job salva `llm_usage_events` por task
- O Job Detail mostra tokens e custos simulados
- O Batch permite selecionar artigos e calcular custo total
- Export CSV de custo simulado por artigo

