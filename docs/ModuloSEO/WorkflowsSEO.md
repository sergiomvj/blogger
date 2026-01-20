Perfeito. Abaixo está a **entrega completa, técnica e acionável**, pensada exatamente para **time de desenvolvimento + N8N + Supabase**, sem floreio conceitual.

Vou estruturar em **6 blocos**, exatamente como você pediu, com **padrão de implementação real**.

---

# 🧠 MÓDULO SEO INTELLIGENCE ENGINE

**Arquitetura: App (UI) + Supabase + N8N + LLM Providers**

---

# 1️⃣ FLUXOS N8N

### (Evento → Webhook → Agentes)

## 🔹 Visão Geral dos Fluxos

```
[App/UI]
   ↓ (Webhook)
[N8N Orchestrator]
   ↓
[Agentes SEO]
   ↓
[Supabase]
   ↓
[Article Generator]
```

---

## 🔷 FLUXO 1 — Trigger SEO (Evento Inicial)

### Gatilhos possíveis

* Artigo criado manualmente
* Import CSV / Google Sheet
* Modo Batch
* Modo Agendado

### Webhook N8N

```
POST /webhook/seo/start
```

### Payload

```json
{
  "article_id": "uuid",
  "topic": "tema do artigo",
  "language": "pt-BR",
  "region": "BR",
  "article_type": "informativo",
  "mode": "single | batch | scheduled"
}
```

---

## 🔷 FLUXO 2 — Normalização & Contexto

**Agente: SEO Context Agent**

* Normaliza tema
* Detecta idioma (fallback)
* Define estágio de funil
* Salva contexto inicial

➡️ Atualiza `seo_context`

---

## 🔷 FLUXO 3 — Keyword Discovery

**Agente: Keyword Agent**

* Gera seed keywords (LLM)
* Consulta:

  * Google Trends
  * Keyword Planner (indireto)
* Consolida resultados
* Classifica (head / mid / long)

➡️ Salva em `seo_keywords`

---

## 🔷 FLUXO 4 — Tendências

**Agente: Trends Agent**

* Avalia interesse temporal
* Marca:

  * Evergreen
  * Trending
  * Seasonal
* Atribui `trend_score`

➡️ Atualiza keywords

---

## 🔷 FLUXO 5 — Intenção de Busca

**Agente: Search Intent Agent**

* Classifica intenção
* Detecta desalinhamentos
* Gera alertas SEO

➡️ Atualiza `seo_context`

---

## 🔷 FLUXO 6 — Long-Tail & LSI

**Agente: Semantic Agent**

* Long-tail (perguntas reais)
* Termos LSI
* Classificação de uso:

  * Conteúdo
  * FAQ
  * Snippet

➡️ Salva em `seo_semantics`

---

## 🔷 FLUXO 7 — Estrutura & Meta

**Agente: Content Structure Agent**

* Gera outline SEO
* Associa keywords → headings
* Cria:

  * Meta title
  * Meta description
* Gera FAQs

➡️ Salva em `seo_outline` e `seo_meta`

---

## 🔷 FLUXO 8 — Score SEO Final

**Agente: SEO Scoring Agent**

* Calcula score
* Define status:

  * ready
  * review
  * rework

➡️ Atualiza `seo_analysis`

---

# 2️⃣ SCHEMAS SUPABASE

### (PostgreSQL)

---

## 🔹 Tabela: `seo_projects`

```sql
create table seo_projects (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamp default now()
);
```

---

## 🔹 Tabela: `seo_articles`

```sql
create table seo_articles (
  id uuid primary key,
  project_id uuid references seo_projects(id),
  topic text,
  language text,
  region text,
  status text,
  created_at timestamp default now()
);
```

---

## 🔹 Tabela: `seo_keywords`

```sql
create table seo_keywords (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  keyword text,
  type text, -- primary, secondary, long_tail
  volume_estimate integer,
  competition text,
  trend_score numeric,
  intent text
);
```

---

## 🔹 Tabela: `seo_semantics`

```sql
create table seo_semantics (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  term text,
  category text -- lsi, synonym, concept
);
```

---

## 🔹 Tabela: `seo_outline`

```sql
create table seo_outline (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  heading_type text,
  heading_text text,
  linked_keywords text[]
);
```

---

## 🔹 Tabela: `seo_meta`

```sql
create table seo_meta (
  article_id uuid primary key,
  meta_title text,
  meta_description text
);
```

---

## 🔹 Tabela: `seo_scores`

```sql
create table seo_scores (
  article_id uuid primary key,
  score integer,
  status text,
  evaluated_at timestamp default now()
);
```

---

# 3️⃣ UI DO MÓDULO SEO

### (Frontend)

## 🔹 Tela 1 — SEO Dashboard

* Lista de artigos
* Status SEO
* Score
* Tendência (badge)

---

## 🔹 Tela 2 — SEO Analyzer (por artigo)

**Abas**

* Keywords
* Long-Tail
* Estrutura
* Meta & FAQ
* Trends
* Score

---

## 🔹 Tela 3 — Configurações SEO

* Idioma padrão
* Região
* Provedores ativos
* LLM padrão
* Limites de custo

---

## 🔹 Tela 4 — Batch & Scheduler

* Upload CSV / Sheet
* Definir horários
* Prioridade
* Simulação de custo

---

# 4️⃣ INTEGRAÇÃO COM CÁLCULO DE CUSTO POR LLM

## 🔹 Tabela: `llm_providers`

```sql
create table llm_providers (
  id uuid primary key,
  name text,
  input_cost numeric,
  output_cost numeric
);
```

---

## 🔹 Tabela: `llm_usage`

```sql
create table llm_usage (
  article_id uuid,
  provider text,
  tokens_input integer,
  tokens_output integer,
  estimated_cost numeric
);
```

---

## 🔹 Fluxo N8N

* Cada agente reporta tokens usados
* Calcula custo por etapa
* Soma custo total por artigo
* Disponibiliza:

  * Por artigo
  * Por batch
  * Por período

---

# 5️⃣ MODO BATCH (100+ ARTIGOS)

## 🔹 Entrada

* CSV
* Google Sheet
* API

## 🔹 Estratégia

* Processar em lotes (ex: 10 artigos)
* Delay automático (rate limit)
* Retry inteligente
* Log por artigo

## 🔹 Controle

* Pausar
* Retomar
* Reprocessar falhas

---

# 6️⃣ MODO AGENDADO

## 🔹 Scheduler (N8N Cron)

### Exemplos

* Diário às 03:00
* Semanal por categoria
* Publicação alinhada com tendências

---

## 🔹 Fluxo

```
[Cron]
 → Seleciona tópicos
 → Gera SEO
 → Atualiza status
 → Notifica
```

---

## 🔐 Observações Técnicas Importantes

* Tudo **idempotente**
* Tudo **reprocessável**
* Nenhum provedor hardcoded
* Logs centralizados
* Pronto para multi-tenant

---

# ✅ RESULTADO FINAL

Com isso você tem:

✔ SEO totalmente automatizado
✔ Integração real com dados gratuitos
✔ Controle absoluto de custo
✔ Escala para centenas de artigos
✔ Arquitetura limpa para expansão futura

---


