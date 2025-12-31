export interface Batch {
    id: string;
    name: string;
    source_csv_filename: string;
    created_by?: string;
    status: 'created' | 'processing' | 'completed' | 'failed';
    created_at: Date;
    updated_at: Date;
}

export interface Job {
    id: string;
    batch_id: string;
    job_key: string;
    idempotency_key: string;
    revision: number;
    blog_key: string;
    blog_id: number;
    category?: string;
    objective_pt?: string;
    theme_pt?: string;
    language_target: 'pt' | 'en' | 'es';
    word_count: 500 | 1000 | 2000;
    status: 'queued' | 'running' | 'done' | 'failed' | 'needs_review';
    current_step: string;
    attempts: number;
    last_error?: string;
    wp_post_id?: number;
    wp_post_url?: string;
    selected: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CsvRow {
    blog: string;
    category: string;
    objective: string;
    theme: string;
    word_count: string; // Vem como string do CSV
    language: string;
    image_url?: string;
}

export interface ProcessingResult {
    valid: CsvRow[];
    invalid: { row: any; errors: string[] }[];
}
