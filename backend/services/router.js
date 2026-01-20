export const ROUTER_CONFIG = {
    models: {
        article_body: [
            { provider: "openai", model: "openai/gpt-4o", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        outline: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        headings: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        keyword_plan: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        seo_meta: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        seo_title: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        tags: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        faq: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        internal_links: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        image_prompt: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        quality_gate: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        semantic_brief: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ],
        keyword_suggestion: [
            { provider: "openai", model: "openai/gpt-4o-mini", priority: 1 },
            { provider: "openrouter", model: "mistralai/mistral-small-3.2-24b-instruct", priority: 2 }
        ]
    }
};
