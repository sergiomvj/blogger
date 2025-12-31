# AutoWriter Multisite – Pipeline de IA (Conteúdo + SEO + Prompts)

## 1. Objetivo

Definir um pipeline determinístico, versionável e auditável para gerar artigos SEO-ready a partir de inputs em português, com saída no idioma especificado.

Princípios:
- Separar **planejamento** (outline/keywords) da **redação** (body)
- Versionar prompts
- Saídas estruturadas (JSON) para reduzir inconsistência
- Quality Gate obrigatório antes de publicar

---

## 2. Entradas e Saídas

### 2.1 Entrada (por linha do CSV)

- `objective` (PT)
- `theme` (PT)
- `category`
- `word_count` (500/1000/2000)
- `language` (pt/en/es)
- opcionais: `tone`, `cta`, `tags`, `sources`, `blacklist_terms`, `faq`, `internal_links`

### 2.2 Saída (artefatos)

1. `payload.json` (contrato para o WP)
2. `post.md` (backup editorial)
3. `audit.json` (metadados, checks, custos)

---

## 3. Modelo de Dados Interno (Dashboard)

### 3.1 Context Object

```json
{
  "job": {
    "id": "J-...",
    "blog_id": 3,
    "category": "Fitness",
    "language": "en",
    "word_count": 1000
  },
  "input_pt": {
    "objective": "...",
    "theme": "...",
    "tone": "...",
    "cta": "..."
  },
  "editorial": {
    "brand_voice": "...",
    "audience": "...",
    "reading_level": "..."
  },
  "seo": {
    "primary_keyword": "",
    "secondary_keywords": [],
    "lsi_keywords": []
  },
  "outputs": {}
}
```

---

## 4. Estratégia de Tradução (Input PT → Output)

### 4.1 Por que traduzir semanticamente antes do outline?
Mesmo que o input esteja em PT, a estrutura e as nuances da redação final em EN/ES mudam (termos, ângulos, sinônimos, search intent).

### 4.2 Como fazer
- Step T0: gerar uma versão “semantic brief” no idioma alvo:
  - tema central reescrito
  - objetivo reescrito
  - público-alvo presumido
  - intenções de busca

Esse brief **não é publicado**, apenas guia as etapas seguintes.

---

## 5. Etapas do Pipeline

Cada etapa tem:
- `task` (nome)
- `prompt_version`
- `input` estruturado
- `output` estruturado
- validação

### T0 – Semantic Brief (idioma alvo)
**Objetivo:** transformar `objective`/`theme` em um brief curto no idioma final.

**Output:**
- `brief` (100–200 palavras)
- `audience`
- `search_intent`

---

### T1 – Outline (H2/H3)
**Objetivo:** estrutura completa do artigo.

**Output (JSON):**
- `title_candidates` (3)
- `outline`: lista de seções H2 e subseções H3
- `angle_notes`: diretrizes para cada seção

---

### T2 – Keyword Plan (API + LLM)
**Objetivo:** juntar keywords vindas da API com um plano de inserção.

**Inputs:**
- dados API keywords
- outline

**Output (JSON):**
- `primary_keyword`
- `secondary_keywords`
- `lsi_keywords`
- `keyword_to_section_map`

---

### T3 – Meta Description (~150 palavras)
**Objetivo:** meta description natural e persuasiva.

**Output:**
- `meta_description`

---

### T4 – Title SEO (final)
**Objetivo:** escolher título final.

Regras:
- incluir keyword principal
- evitar clickbait
- 55–65 caracteres (preferência, não obrigatório)

**Output:**
- `title`
- `slug`

---

### T5 – Headings SEO
**Objetivo:** títulos H2/H3 finais (otimizados).

**Output:**
- `headings` (JSON)

---

### T6 – Article Body (HTML)
**Objetivo:** gerar o conteúdo completo.

Requisitos:
- linguagem correta
- tamanho aproximado
- incluir:
  - Introdução
  - H2/H3
  - listas
  - conclusão
  - CTA

**Output:**
- `content_html`
- `excerpt` (150 palavras, pode reutilizar meta)

---

### T7 – Tags Suggestion (opcional)
**Objetivo:** sugerir tags (até 10) se não vierem do CSV.

**Output:**
- `tags`

---

### T8 – FAQ Block (opcional)
Se `faq=yes`, gerar 3–6 perguntas e respostas curtas.

**Output:**
- `faq` (array)

---

### T9 – Internal Linking (opcional)
Se `internal_links=auto`, sugerir 3–5 âncoras e URLs (o Dashboard pode buscar via WP REST).

**Output:**
- `internal_links` (array)

---

### T10 – Image Prompts
**Objetivo:** criar prompts para:
- featured image
- top image

**Output (JSON):**
- `featured_prompt`
- `top_prompt`
- `featured_alt`
- `top_alt`

---

## 6. Quality Gate (Obrigatório)

O Quality Gate roda após T6/T10 e antes de publicar.

Checks:

1) **Word count**
- 500: 450–650
- 1000: 900–1150
- 2000: 1800–2300

2) **Idioma**
- detectar idioma (heurística ou lib)
- mismatch → `needs_review`

3) **Estrutura**
- pelo menos 3 H2
- H3 coerentes

4) **Repetição**
- detectar repetição de frases e parágrafos

5) **SEO sanity**
- keyword principal aparece em:
  - title
  - 1º parágrafo
  - ao menos 1 H2 (quando natural)

6) **Termos proibidos**
- respeitar `blacklist_terms`

7) **Claims sensíveis**
- sinalizar linguagem médica/financeira de “garantia”

Saída:
- `passed: true|false`
- `notes[]`

---

## 7. Contratos de Saída (JSON por etapa)

### 7.1 Saída final para WP (montagem)

O Dashboard monta o `payload.json` conforme contrato do plugin.

Campos mínimos:
- title
- slug
- excerpt
- content_html
- categories
- tags
- seo meta
- image prompts/urls

---

## 8. Prompting – Templates (Versionáveis)

### 8.1 Convenções

- `prompt_version`: ex. `1.0.0`
- `system`: regras fixas (idioma, estrutura, segurança)
- `user`: dados do job
- `response_format`: JSON estrito

### 8.2 Template: Outline (T1)

**System (resumo):**
- Responda apenas JSON
- Idioma: `{language}`
- Estrutura: H2/H3
- Evitar repetição

**User (dados):**
- brief
- theme
- objective
- word_count
- category
- tone

**Expected JSON:**
- title_candidates
- outline
- angle_notes

---

### 8.3 Template: Article Body (T6)

Regras:
- HTML válido
- headings definidos
- inserção natural de keywords
- CTA final

**Expected JSON:**
- content_html
- excerpt

---

### 8.4 Template: Image Prompts (T10)

Regras:
- Descrever com clareza
- Evitar texto embutido na imagem
- Definir estilo consistente por blog

**Expected JSON:**
- featured_prompt
- top_prompt
- featured_alt
- top_alt

---

## 9. Roteamento de LLM por Tarefa (pré-configurado)

O Dashboard deve permitir mapear modelos por tarefa:

- `outline`: modelo rápido
- `seo_title/meta`: modelo econômico
- `article_body`: modelo de alta qualidade
- `image_prompt`: modelo econômico

Com fallback automático.

---

## 10. Artefatos de Backup

### 10.1 post.md

Estrutura sugerida:

```md
---
title: ...
language: en
category: ...
primary_keyword: ...
word_count_target: 1000
job_id: ...
---

# Title

## H2 ...
...
```

### 10.2 audit.json

- providers e modelos usados
- tokens/custos
- tempos por etapa
- checks quality gate

---

## 11. Checklist de Implementação (Pipeline)

- [ ] Implementar T0–T10
- [ ] Garantir JSON strict em etapas estruturadas
- [ ] Quality Gate com notes
- [ ] Montagem do payload final
- [ ] Persistir artifacts
- [ ] Relatório por batch

---

**Status:** Pipeline de IA definido e pronto para implementação.

