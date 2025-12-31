# AutoWriter Multisite – Integração SEO (Yoast / RankMath + Boas Práticas)

## 1. Objetivo

Garantir que cada post gerado chegue ao WordPress como **Draft SEO-ready**, com:
- título otimizado
- meta description coerente
- keywords planejadas
- headings bem estruturados
- schema básico quando aplicável
- compatibilidade com Yoast ou RankMath

---

## 2. Estratégia SEO (no Pipeline)

### 2.1 Keyword Strategy

- **Primary keyword**: 1 por artigo
- **Secondary keywords**: 3–8
- **LSI / related**: 5–15

Regras:
- Distribuição natural (evitar keyword stuffing)
- Variar sinônimos
- Focar em intenção de busca (informacional vs comercial)

### 2.2 Onde usar primary keyword (sanity)

- Title
- Slug (quando fizer sentido)
- Primeiro parágrafo
- 1 heading (H2) ou subtítulo
- 2–4 ocorrências no texto (dependendo do tamanho)

---

## 3. Campos SEO no Payload

O Dashboard envia:

- `seo.focus_keyword`
- `seo.meta_title`
- `seo.meta_description`
- `seo.schema` (opcional)

Além disso:
- `post.slug`
- `post.excerpt`

---

## 4. Integração Yoast

### 4.1 Campos via postmeta

- `_yoast_wpseo_title` = meta title
- `_yoast_wpseo_metadesc` = meta description
- `_yoast_wpseo_focuskw` = focus keyword

### 4.2 Campos adicionais (opcionais)

- `_yoast_wpseo_canonical`
- `_yoast_wpseo_opengraph-title`
- `_yoast_wpseo_opengraph-description`

> O MVP pode preencher apenas title/metadesc/focuskw.

---

## 5. Integração RankMath

### 5.1 Campos via postmeta

- `rank_math_title` = meta title
- `rank_math_description` = meta description
- `rank_math_focus_keyword` = focus keyword

### 5.2 Campos adicionais (opcionais)

- `rank_math_canonical_url`
- `rank_math_facebook_title`
- `rank_math_facebook_description`

---

## 6. Auto-detect do Provider

No plugin WP, determinar provider por prioridade:

1) Se config do plugin define `yoast|rankmath|none` → respeitar
2) Se `Yoast SEO` ativo → usar Yoast
3) Se `Rank Math` ativo → usar RankMath
4) Caso nenhum → salvar em metadados próprios do plugin

---

## 7. Schema e FAQ

### 7.1 Article Schema (básico)

- `Article` / `BlogPosting`
- autor
- data
- headline
- image

Normalmente Yoast/RankMath já injetam schema.

**Estratégia recomendada:**
- No MVP, confiar no provider.
- Se provider = none, o plugin pode salvar schema como JSON-LD e inserir via hook.

### 7.2 FAQ Schema

Se `faq=yes` (no CSV):
- Gerar bloco FAQ no conteúdo
- RankMath/Yoast podem detectar
- Alternativa: inserir JSON-LD FAQ via hook

---

## 8. Slug (URL) – Boas Práticas

### 8.1 Regras

- minúsculas
- sem stopwords desnecessárias
- 3–7 palavras
- incluir primary keyword (quando natural)
- evitar datas (a menos que necessário)

### 8.2 Normalização

- remover acentos
- substituir espaços por hífen

---

## 9. Excerpt e Meta Description

- Excerpt: resumo editorial (pode ser = meta)
- Meta description: 150 palavras (seu requisito)

> Observação: SEO clássico recomenda 150–160 caracteres, mas como você definiu 150 palavras, manteremos.
> Se quiser, podemos adicionar um modo alternativo: `meta_length=chars`.

---

## 10. Open Graph (OG) e Social

Recomendação:
- Featured image deve ser usada como OG default

Campos opcionais:
- OG title = meta title
- OG description = meta description

---

## 11. Internal Linking (SEO Boost)

Se `internal_links=auto`:

- Dashboard consulta WP REST por posts relevantes
- Sugere 3–5 links
- Injeta no texto com âncoras naturais

---

## 12. Checklist SEO (Quality Gate)

- [ ] primary keyword definida
- [ ] title contém primary keyword
- [ ] slug coerente
- [ ] meta description presente
- [ ] H2/H3 estruturados
- [ ] densidade natural de keywords
- [ ] featured image anexada (ou flagged)
- [ ] alt text presente

---

## 13. Implementação – Funções do Plugin

Módulo sugerido: `class-autowriter-seo.php`

Métodos:
- `detect_provider()`
- `apply_yoast_meta($post_id, $seo)`
- `apply_rankmath_meta($post_id, $seo)`
- `apply_fallback_meta($post_id, $seo)`

---

**Status:** Integração SEO definida e pronta para implementação.

