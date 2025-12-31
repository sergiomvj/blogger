# AutoWriter Multisite – Especificação do CSV (Schema + Regras)

## 1. Objetivo

O CSV é a **fonte de verdade** para criação de artigos. Cada linha representa **1 artigo** a ser gerado/publicado como Draft em um site do WordPress Multisite.

- **Input sempre em português**
- Output no **idioma definido** na linha
- Suporte a imagens geradas externamente ou URL manual

---

## 2. Formato do Arquivo

- Encoding: **UTF-8**
- Separador: `,` (vírgula)
- Header obrigatório
- Quebra de linha: LF/CRLF

---

## 3. Colunas – MVP (Recomendadas)

### 3.1 Colunas obrigatórias

| Coluna | Tipo | Exemplo | Regras |
|---|---|---|---|
| `blog` | string | `pnpmagazine` | Identificador do site (mapeado para `blog_id`) |
| `category` | string | `Fitness` | Nome da categoria (criar se não existir, conforme configuração) |
| `objective` | string | `Gerar leads para consultoria` | Texto em PT, usado para guiar geração |
| `theme` | string | `Treino HIIT para iniciantes` | Tema central em PT |
| `word_count` | int | `1000` | Apenas: `500`, `1000`, `2000` |
| `language` | string | `en` | Idioma de saída (ISO-2): `pt`, `en`, `es` |

### 3.2 Colunas opcionais (MVP)

| Coluna | Tipo | Exemplo | Uso |
|---|---|---|---|
| `tags` | string | `hiit;cardio;fat loss` | Lista separada por `;` |
| `tone` | string | `moderno;direto;bem-humorado` | Diretriz editorial |
| `cta` | string | `Assine a newsletter` | CTA final |
| `sources` | string | `https://...;https://...` | Referências sugeridas (opcional) |

---

## 4. Imagens – Colunas (Manual URL / Mixed)

O sistema suporta 2 imagens:

- `featured_image_url` (featured / index)
- `top_image_url` (imagem no topo do conteúdo)

### 4.1 Colunas opcionais para URL manual

| Coluna | Tipo | Exemplo |
|---|---|---|
| `featured_image_url` | url | `https://cdn.site.com/featured.webp` |
| `top_image_url` | url | `https://cdn.site.com/top.webp` |

### 4.2 Alt text manual (opcional)

| Coluna | Tipo | Exemplo |
|---|---|---|
| `featured_image_alt` | string | `Homem correndo em trilha ao amanhecer` |
| `top_image_alt` | string | `Treino HIIT em casa com kettlebell` |

**Regra:** se `*_alt` estiver vazio, o sistema gera automaticamente no idioma final.

---

## 5. Campos Avançados (Opcional – v1.1+)

| Coluna | Tipo | Exemplo | Uso |
|---|---|---|---|
| `blog_id_override` | int | `3` | Se você preferir controlar direto o `blog_id` |
| `author_email` | string | `editor@site.com` | Define o autor do post |
| `status` | string | `draft` | Suporta `draft` (default); futuro: `future`, `publish` |
| `publish_date` | datetime | `2026-01-05 09:00` | Para agendamento (futuro) |
| `blacklist_terms` | string | `cura;garantia;milagre` | Termos proibidos |
| `internal_links` | string | `auto` | `auto` ou lista de URLs |
| `faq` | string | `yes` | Gera FAQ (bom para SEO) |

---

## 6. Exemplo Completo (CSV)

```csv
blog,category,objective,theme,word_count,language,tags,tone,cta,featured_image_url,top_image_url,featured_image_alt,top_image_alt,sources
pnpmagazine,Fitness,Gerar leads para consultoria,HIIT para iniciantes,1000,pt,"hiit;emagrecimento;cardio","moderno;direto","Agende uma avaliação",,,,
insidescoop,Technology,Informar e educar,Como a IA está mudando o trabalho,2000,en,"ai;future of work","minimalista;objetivo","Subscribe for weekly insights",https://cdn.me/feat.webp,https://cdn.me/top.webp,"Futuristic office with AI",,"https://www.weforum.org;https://oecd.org"
```

---

## 7. Mapeamento `blog` → `blog_id`

### 7.1 Opção recomendada
Manter um arquivo/tabela no Dashboard:

- `blog_key` (string) → `blog_id` (int)

Exemplo:

| blog_key | blog_id |
|---|---|
| pnpmagazine | 2 |
| insidescoop | 3 |
| megablog | 4 |

### 7.2 Validação

- Se `blog` não existir no mapa, o job falha com erro: `BLOG_NOT_FOUND`

---

## 8. Regras de Validação (Quality of Input)

- `objective` e `theme` não podem ser vazios
- `word_count` deve ser um dos valores permitidos
- `language` deve ser suportado
- URLs de imagens devem ser http(s)
- Se `featured_image_url` existir e for inválida → job vira `needs_review` (não falha definitivamente)

---

## 9. Estratégia de Default

Se colunas opcionais não vierem:

- `tags` → geradas pelo pipeline
- `tone` → preset do blog
- `cta` → preset do blog
- `images` → geradas por API externa
- `alts` → gerados

---

## 10. Extensibilidade

O schema foi desenhado para permitir adicionar colunas sem quebrar o MVP.

Princípio:
- Colunas desconhecidas são ignoradas, mas armazenadas em `raw_row_json` para auditoria.

---

**Status:** Schema do CSV pronto para implementação no Dashboard + Plugin.

