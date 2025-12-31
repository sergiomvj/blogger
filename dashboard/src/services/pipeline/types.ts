export interface StepResult {
    success: boolean;
    output?: any;
    error?: string;
    metrics?: {
        inputTokens: number;
        outputTokens: number;
        latencyMs: number;
        model: string;
    };
}

export interface PipelineContext {
    jobId: string;
    input: {
        theme: string;
        objective: string;
        language: 'pt' | 'en' | 'es';
        wordCount: number;
        blogId: number;
        category?: string;
    };
    artifacts: {
        t0_semantic_brief?: any;
        t1_outline?: any;
        t2_keyword_plan?: any;
        t3_meta_description?: any;
        t4_title_seo?: any;
        t5_headings_seo?: any;
        t6_article_body?: any;
        [key: string]: any;
    };
}
