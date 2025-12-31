# AutoWriter Multisite – Pipeline de Imagens (Geração Externa + URL Manual)

## 1. Objetivo

Garantir geração e inserção de imagens com **consistência visual**, **controle editorial** e **baixa taxa de falhas**, mantendo o WordPress como camada leve.

O sistema suporta 2 imagens por artigo:
- **Featured Image** (imagem indexada / destaque)
- **Top Image** (imagem no topo do conteúdo)

---

## 2. Modos de Imagem

### 2.1 `external_generated` (default)
- Dashboard gera imagens via API externa
- Faz upload no WordPress Media Library via REST

### 2.2 `manual_url_allowed`
- Usuário fornece URL de imagem no CSV (ou UI)
- Dashboard baixa a imagem, valida e faz upload no WP

### 2.3 `mixed`
- Se URL manual existir → usa
- Se não existir → gera via API externa

### 2.4 Fallback
- Se gerar/fazer download falhar:
  - publicar Draft sem imagem
  - job vira `needs_review` com step `images_failed`

---

## 3. Presets de Estilo por Blog (Consistência)

Cada blog deve ter um preset salvo no Dashboard:

- `style_id`
- `visual_theme` (ex.: minimalista, photo-real, editorial)
- `palette_hint` (texto, sem forçar cores)
- `composition` (close-up, wide, portrait, etc.)
- `do_not_include` (ex.: logos, marcas, texto)

Exemplo (preset):

```json
{
  "blog_key": "pnpmagazine",
  "style_id": "pnp_editorial_v1",
  "visual_theme": "editorial photo-realistic",
  "composition": "clean subject, high detail, natural lighting",
  "constraints": [
    "no embedded text",
    "no watermarks",
    "no brand logos",
    "no distorted anatomy"
  ]
}
```

---

## 4. Contrato do Prompt de Imagem

O pipeline de IA (T10) deve produzir prompts estruturados.

### 4.1 Saída esperada (JSON)

```json
{
  "featured_prompt": "...",
  "top_prompt": "...",
  "featured_alt": "...",
  "top_alt": "...",
  "style": {
    "style_id": "pnp_editorial_v1",
    "visual_theme": "editorial photo-realistic",
    "constraints": ["no text", "no watermark"]
  }
}
```

### 4.2 Regras do prompt

- Nunca pedir texto dentro da imagem
- Nunca pedir logos/marcas
- Descrever:
  - assunto principal
  - cenário
  - emoção/atmosfera
  - composição
  - lente/ângulo (opcional)
- Sempre compatível com o idioma do blog (prompt em EN recomendado para consistência)

---

## 5. Integração com API Externa (Geração)

### 5.1 Estratégia

- Dashboard chama API de imagem com:
  - `prompt`
  - `size` (padrão)
  - `quality` (padrão)
  - `n=1`

Gerar duas imagens por job:
- featured: `1200x630` (ideal para OG / index)
- top: `1600x900` (hero/top)

> Os tamanhos podem variar conforme o tema do site.

### 5.2 Idempotência

- `image_idempotency_key = job_id + image_type + prompt_hash`
- Se já existe artifact gerado, reutilizar (evita custo duplicado)

---

## 6. Download + Validação (Manual URL)

Quando o CSV fornecer URLs:

- Validar:
  - http/https
  - tamanho máximo (config)
  - mime permitido
- Baixar com timeout
- Se falhar:
  - marcar `needs_review`

Mimes recomendados:
- `image/webp`
- `image/jpeg`
- `image/png`

---

## 7. Storage e Artifacts

### 7.1 Armazenamento temporário

- Pasta local: `/tmp/autowriter/{job_id}/`

### 7.2 Storage permanente (backup)

- S3-compatible:
  - `images/{job_id}/featured.webp`
  - `images/{job_id}/top.webp`
  - `artifacts/{job_id}/image-prompts.json`

Registrar em tabela `artifacts`:
- type = `image_generated` / `image_manual` / `image_prompt`

---

## 8. Upload para WordPress Media Library

### 8.1 Método

- POST `/wp-json/wp/v2/media`
- Headers:
  - `Content-Disposition: attachment; filename="..."`
  - `Content-Type: image/webp`

### 8.2 Metadados

Após upload:
- Set `alt_text` (via endpoint ou postmeta)
- Set `title`
- Set `caption` (opcional)

Nome de arquivo recomendado:
- `slug-primarykeyword-featured.webp`
- `slug-primarykeyword-top.webp`

---

## 9. Inserção no Post

### 9.1 Featured Image

- Setar `featured_media` no post

### 9.2 Top Image

- Inserir bloco `core/image` no início do conteúdo
- Alternativa: HTML `<figure>`

---

## 10. Observabilidade

Registrar por imagem:
- tempo de geração
- custo estimado
- prompt hash
- provider/model
- status upload WP

Errors comuns:
- timeout API
- invalid mime
- upload denied

---

## 11. Segurança

- Validar URLs externas (manual) para evitar SSRF:
  - bloquear IPs privados
  - permitir apenas domínios allowlist (opcional)
- Limitar tamanho de download

---

## 12. Checklist de Implementação

- [ ] Presets por blog
- [ ] Prompt contract (JSON)
- [ ] Idempotência por imagem
- [ ] Geração via API
- [ ] Download manual URL + validações
- [ ] Storage artifacts
- [ ] Upload WP Media
- [ ] Alt/title/caption
- [ ] Inserção no post
- [ ] Logs/custos

---

**Status:** Pipeline de imagens definido e pronto para implementação.

