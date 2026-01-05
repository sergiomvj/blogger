export const SCHEMAS = {
    semantic_brief: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "semantic_brief" },
            language: { enum: ["pt", "en", "es"] },
            data: {
                type: "object",
                required: ["brief", "audience", "search_intent"],
                properties: {
                    brief: { type: "string", minLength: 50 },
                    audience: { type: "string" },
                    search_intent: { enum: ["informational", "commercial", "transactional", "navigational", "mixed"] }
                }
            }
        }
    },
    outline: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "outline" },
            data: {
                type: "object",
                required: ["title_candidates", "outline"],
                properties: {
                    title_candidates: { type: "array", minItems: 3, items: { type: "string" } },
                    outline: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["h2", "h3"],
                            properties: {
                                h2: { type: "string" },
                                h3: { type: "array", items: { type: "string" } }
                            }
                        }
                    }
                }
            }
        }
    },
    keyword_plan: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "keyword_plan" },
            data: {
                type: "object",
                required: ["primary_keyword", "secondary_keywords", "lsi_keywords", "keyword_to_section_map"],
                properties: {
                    primary_keyword: { type: "string" },
                    secondary_keywords: { type: "array", items: { type: "string" } },
                    lsi_keywords: { type: "array", items: { type: "string" } },
                    keyword_to_section_map: { type: "array", items: { type: "object", required: ["keyword", "target"] } }
                }
            }
        }
    },
    seo_meta: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "seo_meta" },
            data: {
                type: "object",
                required: ["meta_description"],
                properties: {
                    meta_description: { type: "string", minLength: 50 }
                }
            }
        }
    },
    seo_title: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "seo_title" },
            data: {
                type: "object",
                required: ["title", "slug"],
                properties: {
                    title: { type: "string" },
                    slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }
                }
            }
        }
    },
    headings: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "headings" },
            data: {
                type: "object",
                required: ["headings"],
                properties: {
                    headings: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["h2", "h3"],
                            properties: {
                                h2: { type: "string" },
                                h3: { type: "array", items: { type: "string" } }
                            }
                        }
                    }
                }
            }
        }
    },
    article_body: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "article_body" },
            data: {
                type: "object",
                required: ["content_html", "excerpt"],
                properties: {
                    content_html: { type: "string", minLength: 200 },
                    excerpt: { type: "string" }
                }
            }
        }
    },
    tags: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "tags" },
            data: {
                type: "object",
                required: ["tags"],
                properties: {
                    tags: { type: "array", items: { type: "string" } }
                }
            }
        }
    },
    faq: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "faq" },
            data: {
                type: "object",
                required: ["faq"],
                properties: {
                    faq: { type: "array", items: { type: "object", required: ["q", "a"] } }
                }
            }
        }
    },
    internal_links: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "internal_links" },
            data: {
                type: "object",
                required: ["internal_links"],
                properties: {
                    internal_links: { type: "array", items: { type: "object", required: ["anchor", "url"] } }
                }
            }
        }
    },
    image_prompt: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "image_prompt" },
            data: {
                type: "object",
                required: ["featured_prompt", "top_prompt", "featured_alt", "top_alt"],
                properties: {
                    featured_prompt: { type: "string" },
                    top_prompt: { type: "string" },
                    featured_alt: { type: "string" },
                    top_alt: { type: "string" }
                }
            }
        }
    },
    quality_gate: {
        type: "object",
        required: ["task", "language", "prompt_version", "data"],
        properties: {
            task: { const: "quality_gate" },
            data: {
                type: "object",
                required: ["passed", "notes", "checks"],
                properties: {
                    passed: { type: "boolean" },
                    notes: { type: "array", items: { type: "string" } },
                    checks: {
                        type: "object",
                        required: ["language_ok", "word_count_ok", "structure_ok", "seo_ok", "blacklist_ok"],
                        properties: {
                            language_ok: { type: "boolean" },
                            word_count_ok: { type: "boolean" },
                            structure_ok: { type: "boolean" },
                            seo_ok: { type: "boolean" },
                            blacklist_ok: { type: "boolean" }
                        }
                    }
                }
            }
        }
    }
};
