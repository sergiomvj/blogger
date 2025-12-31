export interface ModelConfig {
    provider: 'openrouter' | 'openai' | 'gemini';
    model: string;
    priority: number;
}

export type TaskType =
    | 'semantic_brief'
    | 'outline'
    | 'keyword_plan'
    | 'seo_meta'
    | 'seo_title'
    | 'headings'
    | 'article_body'
    | 'tags'
    | 'faq'
    | 'internal_links'
    | 'image_prompt'
    | 'quality_gate';

export const LLM_STRATEGY: Record<TaskType, ModelConfig[]> = {
    article_body: [
        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 1 },
        { provider: 'openrouter', model: 'moonshotai/kimi-k2:free', priority: 2 },
        { provider: 'openrouter', model: 'xiaomi/mimo-v2-flash:free', priority: 3 }
    ],
    outline: [
        { provider: 'openrouter', model: 'moonshotai/kimi-k2:free', priority: 1 },
        { provider: 'openrouter', model: 'allenai/olmo-3.1-32b-think:free', priority: 2 },
        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 3 }
    ],
    headings: [
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 1 },
        { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', priority: 2 },
        { provider: 'openrouter', model: 'moonshotai/kimi-k2:free', priority: 3 }
    ],
    semantic_brief: [
        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 1 },
        { provider: 'openrouter', model: 'moonshotai/kimi-k2:free', priority: 2 }
    ],
    keyword_plan: [
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 1 },
        { provider: 'openrouter', model: 'z-ai/glm-4.5-air:free', priority: 2 },
        { provider: 'openrouter', model: 'nvidia/nemotron-3-nano-30b-a3b:free', priority: 3 }
    ],
    seo_meta: [
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 1 },
        { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', priority: 2 }
    ],
    seo_title: [
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 1 },
        { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', priority: 2 }
    ],
    tags: [
        { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', priority: 1 },
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 2 }
    ],
    faq: [
        { provider: 'openrouter', model: 'moonshotai/kimi-k2:free', priority: 1 },
        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 2 }
    ],
    internal_links: [
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 1 },
        { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', priority: 2 }
    ],
    image_prompt: [
        { provider: 'openrouter', model: 'google/gemini-2.0-flash-exp:free', priority: 1 },
        { provider: 'openrouter', model: 'openai/gpt-oss-20b:free', priority: 2 }
    ],
    quality_gate: [
        { provider: 'openrouter', model: 'deepseek/deepseek-r1-0528:free', priority: 1 },
        { provider: 'openrouter', model: 'allenai/olmo-3.1-32b-think:free', priority: 2 }
    ]
};
