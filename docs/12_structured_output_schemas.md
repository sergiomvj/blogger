# AutoWriter Multisite – Structured Output Schemas (JSON) + Validação + Repair

## 1. Objetivo

Padronizar **todas** as saídas das etapas do pipeline como JSON validável por schema, garantindo previsibilidade, segurança, auditoria e cálculo de custo confiável.

Regras globais:
- Saída **exclusivamente JSON** (sem texto fora do JSON)
- JSON deve validar contra schema
- Se falhar: 1 tentativa com **Repair Prompt**
- Se falhar de novo: **fallback** para o próximo modelo

---

## 2. Convenções

### 2.1 Campos obrigatórios em todas as respostas

```json
{
  "task": "...",
  "language": "pt|en|es",
  "prompt_version": "1.0.0",
  "data": { }
}
```

### 2.2 Proibições
- Não usar markdown
- Não incluir blocos de código
- Não incluir comentários
- Não incluir aspas “curvas”

---

## 3. Schemas por Etapa

> Abaixo estão os schemas em formato JSON Schema (draft 2020-12). Você pode versionar por arquivo ou por `prompt_version`.

---

### 3.1 T0 – semantic_brief

**Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SemanticBrief",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "semantic_brief"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["brief", "audience", "search_intent"],
      "properties": {
        "brief": {"type": "string", "minLength": 50, "maxLength": 1800},
        "audience": {"type": "string", "minLength": 10, "maxLength": 400},
        "search_intent": {"enum": ["informational", "commercial", "transactional", "navigational", "mixed"]}
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.2 T1 – outline

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Outline",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "outline"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["title_candidates", "outline"],
      "properties": {
        "title_candidates": {
          "type": "array",
          "minItems": 3,
          "maxItems": 5,
          "items": {"type": "string", "minLength": 15, "maxLength": 90}
        },
        "outline": {
          "type": "array",
          "minItems": 3,
          "maxItems": 12,
          "items": {
            "type": "object",
            "required": ["h2", "h3"],
            "properties": {
              "h2": {"type": "string", "minLength": 8, "maxLength": 120},
              "h3": {
                "type": "array",
                "minItems": 0,
                "maxItems": 8,
                "items": {"type": "string", "minLength": 8, "maxLength": 140}
              },
              "notes": {"type": "string", "maxLength": 800}
            },
            "additionalProperties": false
          }
        },
        "angle_notes": {"type": "string", "maxLength": 1200}
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.3 T2 – keyword_plan

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "KeywordPlan",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "keyword_plan"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["primary_keyword", "secondary_keywords", "lsi_keywords", "keyword_to_section_map"],
      "properties": {
        "primary_keyword": {"type": "string", "minLength": 2, "maxLength": 120},
        "secondary_keywords": {"type": "array", "minItems": 3, "maxItems": 12, "items": {"type": "string", "minLength": 2, "maxLength": 120}},
        "lsi_keywords": {"type": "array", "minItems": 5, "maxItems": 25, "items": {"type": "string", "minLength": 2, "maxLength": 120}},
        "keyword_to_section_map": {
          "type": "array",
          "minItems": 3,
          "maxItems": 25,
          "items": {
            "type": "object",
            "required": ["keyword", "target"],
            "properties": {
              "keyword": {"type": "string", "minLength": 2, "maxLength": 120},
              "target": {"type": "string", "minLength": 3, "maxLength": 140}
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.4 T3 – seo_meta

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SEOMeta",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "seo_meta"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["meta_description"],
      "properties": {
        "meta_description": {"type": "string", "minLength": 80, "maxLength": 1200}
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.5 T4 – seo_title (title + slug)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SEOTitle",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "seo_title"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["title", "slug"],
      "properties": {
        "title": {"type": "string", "minLength": 15, "maxLength": 120},
        "slug": {"type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$", "minLength": 3, "maxLength": 120}
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.6 T5 – headings

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Headings",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "headings"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["headings"],
      "properties": {
        "headings": {
          "type": "array",
          "minItems": 3,
          "maxItems": 12,
          "items": {
            "type": "object",
            "required": ["h2", "h3"],
            "properties": {
              "h2": {"type": "string", "minLength": 8, "maxLength": 120},
              "h3": {"type": "array", "items": {"type": "string", "minLength": 8, "maxLength": 140}}
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.7 T6 – article_body (HTML)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ArticleBody",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "article_body"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["content_html", "excerpt"],
      "properties": {
        "content_html": {"type": "string", "minLength": 400, "maxLength": 200000},
        "excerpt": {"type": "string", "minLength": 80, "maxLength": 1800}
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.8 T7 – tags (opcional)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Tags",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "tags"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["tags"],
      "properties": {
        "tags": {
          "type": "array",
          "minItems": 3,
          "maxItems": 12,
          "items": {"type": "string", "minLength": 2, "maxLength": 40}
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.9 T8 – faq (opcional)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FAQ",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "faq"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["faq"],
      "properties": {
        "faq": {
          "type": "array",
          "minItems": 3,
          "maxItems": 8,
          "items": {
            "type": "object",
            "required": ["q", "a"],
            "properties": {
              "q": {"type": "string", "minLength": 8, "maxLength": 140},
              "a": {"type": "string", "minLength": 20, "maxLength": 600}
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.10 T9 – internal_links (opcional)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "InternalLinks",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "internal_links"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["internal_links"],
      "properties": {
        "internal_links": {
          "type": "array",
          "minItems": 1,
          "maxItems": 8,
          "items": {
            "type": "object",
            "required": ["anchor", "url"],
            "properties": {
              "anchor": {"type": "string", "minLength": 3, "maxLength": 80},
              "url": {"type": "string", "minLength": 10, "maxLength": 600}
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.11 T10 – image_prompt

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ImagePrompts",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "image_prompt"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["featured_prompt", "top_prompt", "featured_alt", "top_alt"],
      "properties": {
        "featured_prompt": {"type": "string", "minLength": 30, "maxLength": 2000},
        "top_prompt": {"type": "string", "minLength": 30, "maxLength": 2000},
        "featured_alt": {"type": "string", "minLength": 10, "maxLength": 180},
        "top_alt": {"type": "string", "minLength": 10, "maxLength": 180},
        "style": {
          "type": "object",
          "properties": {
            "style_id": {"type": "string", "maxLength": 80},
            "visual_theme": {"type": "string", "maxLength": 200},
            "constraints": {"type": "array", "items": {"type": "string", "maxLength": 80}, "maxItems": 12}
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 3.12 quality_gate

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "QualityGate",
  "type": "object",
  "required": ["task", "language", "prompt_version", "data"],
  "properties": {
    "task": {"const": "quality_gate"},
    "language": {"enum": ["pt", "en", "es"]},
    "prompt_version": {"type": "string"},
    "data": {
      "type": "object",
      "required": ["passed", "notes", "checks"],
      "properties": {
        "passed": {"type": "boolean"},
        "notes": {"type": "array", "items": {"type": "string", "maxLength": 500}, "maxItems": 30},
        "checks": {
          "type": "object",
          "required": ["language_ok", "word_count_ok", "structure_ok", "seo_ok", "blacklist_ok"],
          "properties": {
            "language_ok": {"type": "boolean"},
            "word_count_ok": {"type": "boolean"},
            "structure_ok": {"type": "boolean"},
            "seo_ok": {"type": "boolean"},
            "blacklist_ok": {"type": "boolean"},
            "repetition_ok": {"type": "boolean"},
            "claims_ok": {"type": "boolean"}
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

## 4. Repair Prompt (padrão)

Quando o JSON não validar, rodar uma chamada com prompt fixo:

- Input: resposta inválida
- Output: JSON corrigido **somente** (sem texto)

Regras:
- preservar conteúdo
- corrigir campos faltantes
- remover texto fora do JSON
- garantir conformidade com schema

---

## 5. Validação (pseudofluxo)

1) `response_json = parse(raw)`
2) `validate(schema, response_json)`
3) se falhar: chamar `repair(task, schema, raw)`
4) validar de novo
5) se falhar: fallback

---

## 6. Integração com Cálculo de Custos

- Cada task gera 1 evento em `llm_usage_events`
- Mesmo que haja repair/fallback, registrar:
  - evento original
  - evento repair
  - evento fallback

O custo do job é soma de todos.

---

**Status:** Schemas estruturados definidos para todas as etapas do pipeline.

