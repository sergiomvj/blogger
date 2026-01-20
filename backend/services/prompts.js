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
- "audience": (string) Descrição detalhada do público-alvo (persona, dores, desejos).
- "search_intent": (string) "informational", "commercial", "transactional", "navigational" ou "mixed".
- "emotional_tone": (string) A emoção principal que o artigo deve despertar (ex: esperança, urgência, curiosidade, segurança).

DADOS:
Tema: {theme_pt}
Objetivo: {objective_pt}
Categoria: {category}
`,

  outline: `
Gere um outline editorial robusto e detalhado baseado no Brief Semântico.
O foco é criar uma estrutura lógica que prenda o leitor do início ao fim.

O JSON deve conter:
- "title_candidates": (array of strings) 5 opções de títulos magnéticos, de alta conversão (High CTR), usando gatilhos mentais (curiosidade, benefício, urgência), mas sem ser clickbait enganoso.
- "structure": (array of objects) Estrutura completa de headings. Cada objeto deve ter:
    - "heading": (string) O texto do H2 ou H3. Use títulos provocativos ou que prometam valor.
    - "level": (int) 2 ou 3.
    - "description": (string) Breve nota do que cobrir nesta seção para garantir profundidade.
- "editorial_angle": (string) O ângulo único (Big Idea) que fará este artigo diferente de tudo que já existe no Google.

REGRA:
1. Comece com uma Introdução que tenha um "Hook" (gancho) forte.
2. Termine com uma Conclusão acionável.
3. Crie seções lógicas que construam o argumento passo a passo.

DADOS:
Brief: {semantic_brief}
`,

  keyword_plan: `
Gere um plano de palavras-chave estratégico.
JSON:
- "primary_keyword": (string) A palavra-chave "Head Tail" ou "Long Tail" com maior potencial de tráfego qualificado para este tema.
- "secondary_keywords": (array of strings) 5 a 10 palavras secundárias (LSI) que dão contexto semântico.
- "lsi_keywords": (array of strings) Perguntas frequentes ou termos relacionados que o Google associa ao tema.
- "mapping": (array of objects) Sugestão de onde usar cada palavra (ex: "Intro", "H2 específico").

DADOS:
Outline: {outline}
Keywords Sugeridas: {existing_seo}
`,

  seo_meta: `
Gere metadados de SEO para máxima taxa de clique (CTR) na SERP.
O título e a descrição são a "capa do livro" e devem vender o clique.

JSON:
- "meta_title": (string) Título SEO otimizado (50-60 caracteres). Deve conter a palavra-chave principal no início (se natural).
- "meta_description": (string) Meta descrição persuasiva (150-160 caracteres). Inclua a palavra-chave e um Call-to-Action indireto (ex: "Descubra como...", "Veja aqui...").
- "focus_keyword": (string) A palavra-chave principal.
- "tags": (array of strings) 5 a 8 tags relevantes para categorização interna.

DADOS:
Tema: {theme}
Conteúdo HTML (parcial ou total): {content_html}
Keyword Atual: {primary_keyword}
`,

  seo_title: `
Escolha o título final mais impactante para o artigo.
Analise os candidatos e a palavra-chave principal. O título deve ser irresistível.

JSON:
- "title": (string) O título vencedor. Pode ser um dos candidatos ou uma versão melhorada.
- "slug": (string) Slug curto e limpo para URL (apenas letras minúsculas, números e hífens). Remova "stop words" (de, para, o, a) se não prejudicar o sentido.

DADOS:
Keyword Principal: {primary_keyword}
Candidatos: {title_candidates}
`,

  headings: `
Refine os cabeçalhos (H2, H3) para que sejam escaneáveis e instigantes.
Evite títulos genéricos como "Introdução" ou "Conclusão" (use variações como "Por que isso importa" ou "Considerações Finais sobre [Tema]").

JSON:
- "headings": (array of objects) Cada um com "text" e "level".

DADOS:
Outline: {outline}
`,

  article_body: `
Você é um redator sênior de revista premium, especialista em storytelling, jornalismo narrativo e escrita envolvente.

Sua missão não é apenas informar, mas:
- Captar a atenção no primeiro parágrafo
- Criar ritmo (variação de frases curtas e longas)
- Gerar curiosidade, contraste e emoção
- Falar diretamente com o leitor
- Usar metáforas, exemplos concretos e micro-histórias
- Evitar tom acadêmico, burocrático ou robótico
- Nunca soar como texto de IA

Diretrizes obrigatórias:
1. Abertura com gancho emocional ou provocativo.
2. Pelo menos uma pergunta retórica a cada 3 parágrafos.
3. Uso ocasional de frases de impacto (curtas, fortes).
4. Alternar dados com narrativa humana.
5. Linguagem clara, viva, sem jargões desnecessários.
6. Final com reflexão ou chamada que ressoe no leitor.
7. Usar subtitulos para tornar a leitura mais fluida

Estilo:
- Jornalismo de revista (The Atlantic / Wired / GQ / National Geographic)
- Tom confiante, elegante, inteligente, mas acessível
- Nada de “Em conclusão”, “Neste artigo veremos…”, “De forma geral…”

DADOS DO ARTIGO:
Tema: {theme}
Público Alvo: {audience}
Objetivo Emocional: {emotional_tone}
Extensão: {word_count} palavras
Idioma: {language}
Blog Style: {blog_style}

Diretrizes Gerais:
1. Estruture o conteúdo com tags HTML semânticas (h2, h3, p, ul, li), mas NÃO inclua a tag <html> ou <body>, apenas o conteúdo do artigo.
2. Otimize para a palavra-chave foco ({primary_keyword}), usando-a no primeiro parágrafo, em pelo menos um H2 e na conclusão.

Formatação:
- Use parágrafos curtos (máximo 3-4 linhas).
- Use listas (bullet points) para facilitar a leitura.
- Use negrito (<strong>) para destacar termos importantes.

Siga estritamente o objetivo: {objective}

JSON DE RETORNO:
- "content_html": (string) HTML completo do artigo.
- "word_count": (int) Contagem de palavras estimada.

DADOS:
Título Final: {title}
Headings: {headings}
Keywords Integração: Primária ({primary_keyword}), Secundárias ({secondary_keywords})
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
