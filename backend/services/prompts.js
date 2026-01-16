export const SYSTEM_PROMPT = `
Você é um assistente editorial profissional de alto nível.
Sua missão é gerar conteúdo otimizado para SEO e engajamento humano.

REGRAS CRÍTICAS DE FORMATO:
1. Responda APENAS com o objeto JSON solicitado.
2. Não inclua Markdown (\`\`\`json ... \`\`\`), explicações ou introduções.
3. Use apenas aspas ASCII duplas (").
4. Mantenha as chaves (keys) do JSON exatamente no idioma solicitado na instrução da task (geralmente em inglês para padronização técnica).
5. O valor dos campos deve estar no idioma: {language}.

CONTEXTO DO BLOG:
{blog_style}

CONTEXTO DO ARTIGO:
{article_style}
`;

export const TASK_PROMPTS = {
  semantic_brief: `
Gere um brief semântico.
O JSON deve conter exatamente estas chaves:
- "brief": (string) Resumo editorial profundo.
- "audience": (string) Descrição detalhada do público-alvo.
- "search_intent": (string: "informational", "commercial", "transactional", "navigational" ou "mixed") Intenção de busca.

DADOS:
Tema: {theme_pt}
Objetivo: {objective_pt}
Categoria: {category}
`,

  outline: `
Gere o outline do artigo baseado no Brief Semântico fornecido.
O JSON deve conter:
- "title_candidates": (array of strings) 3 a 5 opções de títulos magnéticos.
- "structure": (array of objects) Cada objeto com "heading" (string) e "level" (int 2 ou 3).
- "editorial_angle": (string) O ângulo diferencial deste artigo.

DADOS:
Brief: {semantic_brief}
`,

  keyword_plan: `
Gere um plano de palavras-chave.
JSON:
- "primary_keyword": (string) A melhor palavra-chave para focar.
- "secondary_keywords": (array of strings) 3 a 8 palavras secundárias.
- "lsi_keywords": (array of strings) Termos semanticamente relacionados.
- "mapping": (array of objects) Seção -> Palavra-chave.

DADOS:
Outline: {outline}
`,

  seo_meta: `
Gere metadados de SEO.
JSON:
- "meta_description": (string) Meta descrição persuasiva até 160 caracteres.
- "focus_keyword": (string) Repita a keyword principal.

DADOS:
Tema: {theme}
Keyword Principal: {primary_keyword}
`,

  seo_title: `
Defina o título final e o slug.
JSON:
- "title": (string) O título escolhido.
- "slug": (string) URL-friendly (apenas letras, números e hífens).

DADOS:
Keyword Principal: {primary_keyword}
Candidatos: {title_candidates}
`,

  headings: `
Otimize os cabeçalhos (headings) para SEO.
JSON:
- "headings": (array of objects) Cada um com "text" e "level".

DADOS:
Outline: {outline}
`,

  article_body: `
Escreva o corpo do artigo em HTML.
JSON:
- "content_html": (string) O HTML completo do artigo (use <p>, <h2>, <h3>, <ul>, <li>, <strong>).
- "word_count": (int) Contagem final de palavras.

DADOS:
Título: {title}
Headings: {headings}
Keywords: {primary_keyword}, {secondary_keywords}
Tamanho alvo: {word_count}
`,

  tags: `
Sugira tags para o WordPress.
JSON:
- "tags": (array of strings) 5 a 10 tags relevantes.

DADOS:
Tema: {theme}
Keyword: {primary_keyword}
`,

  image_prompt: `
Gere prompts para criação de imagens.
JSON:
- "featured_prompt": (string) Prompt detalhado em inglês.
- "featured_alt": (string) Texto alternativo no idioma local.
- "top_prompt": (string) Prompt para imagem interna em inglês.
- "top_alt": (string) Texto alternativo.

DADOS:
Tema: {theme}
Keyword: {primary_keyword}
`,

  quality_gate: `
Avalie a qualidade do conteúdo final.
JSON:
- "passed": (boolean)
- "score": (int 0-100)
- "notes": (string) Observações de melhoria.

DADOS:
Conteúdo: {content_html}
`,

  faq: `
Crie um FAQ.
JSON:
- "faqs": (array of objects) Pergunta e resposta.

DADOS:
Tema: {theme}
`,

  internal_links: `
Refine o conteúdo HTML injetando links internos de forma natural.
O JSON deve conter:
- "content_html": (string) O HTML atualizado com os links inseridos.
- "links_added": (int) Quantidade de links inseridos.

DADOS:
Conteúdo Atual: {content_html}
Links Disponíveis (Oportunidades): {links_available}

REGRAS:
1. Use as oportunidades de link de forma contextual e natural.
2. Não insira mais de 3-5 links no total.
3. Use a tag <a href="URL">TEXTO</a>.
4. Se nenhuma oportunidade for relevante, retorne o HTML original e links_added: 0.
`,

  keyword_suggestion: `
Você é um especialista em SEO. 
Para o tema "{theme}" com o objetivo "{objective}", gere as 5 melhores palavras-chave e os 5 melhores termos de cauda longa para este artigo em {language}. 
Retorne um objeto JSON com a chave "keywords" contendo todos os 10 termos separados por vírgula.

DADOS:
Tema: {theme}
Objetivo: {objective}
Idioma: {language}
`
};
