export const PROMPTS = {
    T0_SEMANTIC_TRANSLATION: `
Role: Specialized Translator (PT-BR -> {target_language})
Context: You are translating a row from a content planning CSV.
Input:
- Objective: {objective}
- Theme: {theme}
- Category: {category}

Task:
1. Translate "Objective" and "Theme" to {target_language}.
2. Infer a "Search Intent" (Informational, Transactional, Commercial, Navigational).
3. Create a short "Semantic Brief" (2-3 sentences) explaining what this article should be about for the target audience.

Output Schema:
{
  "objective_translated": "string",
  "theme_translated": "string",
  "search_intent": "string",
  "semantic_brief": "string",
  "target_audience": "string"
}
`,

    T1_OUTLINE: `
Role: SEO Content Strategist
Language: {language}
Context: We need a high-ranking blog post outline.
Input:
- Theme: {theme}
- Brief: {brief}
- Target Word Count: {word_count}

Task:
1. Generate 3 click-worthy H1 title candidates.
2. Create a comprehensive structure (H2 and H3).
3. Ensure logical flow.

Output Schema:
{
  "title_candidates": ["string"],
  "structure": [
    {
      "h2": "string",
      "h3": ["string"]
    }
  ]
}
`,

    T2_KEYWORD_CLUSTERING: `
Role: SEO Specialist
Language: {language}
Input:
- Theme: {theme}
- Structure: {structure_json}

Task:
1. Identify the Primary Keyword.
2. List 5-10 Secondary Keywords (LSI).
3. Map keywords to specific H2 sections where they should appear naturally.

Output Schema:
{
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "keyword_mapping": [
    { "keyword": "string", "target_h2": "string" }
  ]
}
`
};
