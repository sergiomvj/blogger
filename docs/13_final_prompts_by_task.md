# AutoWriter Multisite – Prompts Finais por Task (Produção)

Este documento contém **prompts finais**, prontos para produção, alinhados aos **schemas do arquivo 12**. Todos os prompts assumem:

- **Saída SOMENTE JSON válido**
- Compatível com **fallback + repair**
- Idioma final controlado por variável `{language}`
- Uso obrigatório de **structured outputs**

---

## Convenções Globais (usar em TODAS as tasks)

### SYSTEM (fixo)

Você é um assistente editorial profissional.

Regras inegociáveis:
- Responda **exclusivamente** em JSON
- O JSON deve validar exatamente contra o schema fornecido
- Não inclua markdown, explicações ou texto fora do JSON
- Não use comentários
- Use aspas ASCII (")
- Idioma de saída: `{language}`

Se não tiver certeza, faça a melhor inferência possível sem violar o schema.

---

## T0 – semantic_brief

### USER

```text
Task: semantic_brief
Idioma final: {language}

Objetivo (PT): {objective_pt}
Tema central (PT): {theme_pt}
Categoria: {category}
Tamanho desejado: {word_count} palavras

Crie um brief semântico no idioma final contendo:
- resumo editorial claro
- público-alvo presumido
- intenção de busca principal
```

---

## T1 – outline

### USER

```text
Task: outline
Idioma final: {language}

Brief:
{semantic_brief}

Crie:
- 3 a 5 sugestões de título
- Estrutura completa do artigo (H2 e H3)
- Notas de ângulo editorial (opcional)

Respeite boas práticas de SEO e legibilidade.
```

---

## T2 – keyword_plan

### USER

```text
Task: keyword_plan
Idioma final: {language}

Outline:
{outline}

Dados externos de keywords (se houver):
{keywords_api_data}

Crie um plano de palavras-chave contendo:
- 1 keyword principal
- 3 a 12 keywords secundárias
- 5 a 25 LSI/related keywords
- Mapeamento keyword → seção
```

---

## T3 – seo_meta

### USER

```text
Task: seo_meta
Idioma final: {language}

Tema: {theme}
Keyword principal: {primary_keyword}

Crie uma meta description persuasiva, natural e clara.
Tamanho aproximado: até 150 palavras.
```

---

## T4 – seo_title

### USER

```text
Task: seo_title
Idioma final: {language}

Keyword principal: {primary_keyword}
Títulos candidatos:
{title_candidates}

Escolha o melhor título e gere um slug otimizado.
Regras:
- incluir keyword principal se natural
- evitar clickbait
- slug em lowercase, hífens, sem acentos
```

---

## T5 – headings

### USER

```text
Task: headings
Idioma final: {language}

Outline base:
{outline}

Otimize todos os H2 e H3 para SEO e clareza.
```

---

## T6 – article_body

### USER

```text
Task: article_body
Idioma final: {language}

Título final:
{title}

Headings:
{headings}

Keyword principal: {primary_keyword}
Keywords secundárias:
{secondary_keywords}

Requisitos:
- Texto completo em HTML válido
- Introdução clara
- Desenvolvimento profundo
- Conclusão com CTA
- Tamanho alvo: {word_count} palavras
- Inserção natural de keywords
```

---

## T7 – tags (opcional)

### USER

```text
Task: tags
Idioma final: {language}

Tema: {theme}
Keyword principal: {primary_keyword}

Sugira tags relevantes.
```

---

## T8 – faq (opcional)

### USER

```text
Task: faq
Idioma final: {language}

Tema: {theme}
Keyword principal: {primary_keyword}

Crie 3 a 6 perguntas frequentes com respostas curtas.
```

---

## T9 – internal_links (opcional)

### USER

```text
Task: internal_links
Idioma final: {language}

Tema: {theme}
Posts disponíveis:
{internal_posts_list}

Sugira links internos com âncoras naturais.
```

---

## T10 – image_prompt

### USER

```text
Task: image_prompt
Idioma final: {language}

Tema: {theme}
Keyword principal: {primary_keyword}
Estilo visual do blog:
{image_style_preset}

Crie:
- prompt para featured image
- prompt para top image
- alt text para ambas

Regras:
- NÃO incluir texto na imagem
- NÃO incluir logos ou marcas
```

---

## Quality Gate

### USER

```text
Task: quality_gate
Idioma final: {language}

Conteúdo gerado:
{content_html}

Verifique:
- idioma correto
- contagem aproximada de palavras
- estrutura (H2/H3)
- SEO básico
- blacklist terms

Retorne passed=true ou false com notas objetivas.
```

---

## Observações Finais

- Todos os prompts devem ser chamados com `response_format = json`
- Qualquer falha de schema dispara **repair prompt**
- Custos e tokens são medidos por task

---

**Status:** Prompts finais definidos para todas as etapas do pipeline.

