import { Job } from '../types';

const API_BASE = '/api';

const getHeaders = (contentType = 'application/json') => {
    const headers: any = {};
    if (contentType) headers['Content-Type'] = contentType;

    const apiKey = localStorage.getItem('autowriter_api_key');
    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }
    return headers;
};

async function request(path: string, options: RequestInit = {}) {
    const headers = { ...getHeaders((options.body instanceof FormData) ? '' : 'application/json'), ...options.headers };
    if (options.body instanceof FormData) {
        delete (headers as any)['Content-Type'];
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    if (res.status === 401) {
        console.warn('Unauthorized request - Check API Key in Settings');
    }

    return res;
}

export const api = {
    async getBatches() {
        const res = await request('/batches');
        return res.json();
    },

    async getJobs(batchId?: string) {
        const path = batchId ? `/jobs?batch_id=${batchId}` : `/jobs`;
        const res = await request(path);
        return res.json();
    },

    async getSettings() {
        const res = await request(`/settings?t=${Date.now()}`);
        return res.json();
    },

    async getJobCostEstimates(id: string) {
        const res = await request(`/jobs/${id}/cost-estimates`);
        return res.json();
    },

    async updateSettings(settings: any) {
        const res = await request('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return res.json();
    },

    async getJobById(id: string): Promise<Job> {
        const res = await request(`/jobs/${id}`);
        return res.json();
    },

    async getJobArtifacts(id: string) {
        const res = await request(`/jobs/${id}/artifacts`);
        return res.json();
    },

    async deleteJob(id: string) {
        const res = await request(`/jobs/${id}`, { method: 'DELETE' });
        return res.json();
    },

    async retryJob(id: string) {
        const res = await request(`/jobs/${id}/retry`, { method: 'POST' });
        return res.json();
    },

    async uploadCSV(data: FormData) {
        const res = await request('/upload', {
            method: 'POST',
            body: data,
        });
        return res.json();
    },

    async startBatchFromPreArticles(ids?: string[]) {
        const res = await request('/batches/from-pre-articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: ids ? JSON.stringify({ ids }) : undefined
        });
        return res.json();
    },

    async getBlogs() {
        const res = await request('/blogs');
        return res.json();
    },

    async addBlog(blogData: any) {
        const res = await request('/blogs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blogData),
        });
        return res.json();
    },

    async syncBlog(id: string) {
        const res = await request(`/blogs/${id}/sync`, { method: 'POST' });
        return res.json();
    },

    async updateBlog(id: string, blogData: any) {
        const res = await request(`/blogs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blogData),
        });
        return res.json();
    },

    async deleteBlog(id: string) {
        const res = await request(`/blogs/${id}`, { method: 'DELETE' });
        return res.json();
    },

    async getStatsSummary() {
        const res = await request('/stats/summary');
        return res.json();
    },

    async getStatsHistory() {
        const res = await request('/stats/history');
        return res.json();
    },

    async getStatsDetails() {
        const res = await request('/stats/details');
        return res.json();
    },

    async updateBatchBudget(id: string, budget: number) {
        const res = await request(`/batches/${id}/budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budget_limit: budget }),
        });
        return res.json();
    },

    async getActiveBatch() {
        const res = await request('/batches/active');
        return res.json();
    },

    async getDefaultPrompts() {
        const res = await request('/prompts/default');
        return res.json();
    },

    async getCustomPrompts() {
        const res = await request('/prompts');
        return res.json();
    },

    async saveCustomPrompt(taskKey: string, text: string) {
        const res = await request('/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_key: taskKey, prompt_text: text }),
        });
        return res.json();
    },

    async getBlogStyles() {
        const res = await request('/blog-styles');
        return res.json();
    },

    async addBlogStyle(styleData: any) {
        const res = await request('/blog-styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(styleData),
        });
        return res.json();
    },

    async updateBlogStyle(id: string, styleData: any) {
        const res = await request(`/blog-styles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(styleData),
        });
        return res.json();
    },

    async deleteBlogStyle(id: string) {
        const res = await request(`/blog-styles/${id}`, { method: 'DELETE' });
        return res.json();
    },

    async getArticleStyles() {
        const res = await request('/article-styles');
        return res.json();
    },

    async getMedia() {
        const res = await request('/media');
        return res.json();
    },

    getBatchBackupUrl(batchId: string) {
        const apiKey = localStorage.getItem('autowriter_api_key');
        return `${API_BASE}/batches/${batchId}/backup${apiKey ? `?api_key=${apiKey}` : ''}`;
    },

    // Pre-Articles
    async getPreArticles() {
        const res = await request('/pre-articles');
        return res.json();
    },

    async savePreArticle(data: any) {
        const res = await request('/pre-articles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    async updatePreArticle(id: string, data: any) {
        const res = await request(`/pre-articles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    async deletePreArticle(id: string) {
        const res = await request(`/pre-articles/${id}`, { method: 'DELETE' });
        return res.json();
    },

    async searchKeywords(data: { theme: string, objective: string, language: string }) {
        const res = await request('/seo/search-keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    // Published Articles
    async getPublishedArticles(blogKey?: string, status?: string) {
        let path = `/articles?`;
        if (blogKey) path += `blog_key=${blogKey}&`;
        if (status) path += `status=${status}`;
        const res = await request(path);
        return res.json();
    },

    async logout() {
        const { supabase } = await import('./supabaseClient');
        return supabase.auth.signOut();
    },

    // SEO Intelligence
    async getSEOProjects() {
        const res = await request('/seo/projects');
        return res.json();
    },

    async getSEOArticles(projectId?: string) {
        const path = projectId ? `/seo/projects/${projectId}/articles` : '/seo/articles';
        const res = await request(path);
        return res.json();
    },

    async getSEOCandidates() {
        const res = await request('/seo/candidates');
        return res.json();
    },

    async analyzeSEO(id: string, source: 'pre' | 'job') {
        const res = await request('/seo/analyze', {
            method: 'POST',
            body: JSON.stringify({ id, source })
        });
        return res.json();
    },

    async createSEOProject(name: string, description: string) {
        const { data, error } = await (await import('./supabaseClient')).supabase
            .from('seo_projects')
            .insert([{ name, description }])
            .select();
        if (error) throw error;
        return data[0];
    },

    async getSEOAnalysis(articleId: string) {
        const sc = await import('./supabaseClient');
        const [keywords, semantics, outline, meta, score] = await Promise.all([
            sc.supabase.from('seo_keywords').select('*').eq('article_id', articleId),
            sc.supabase.from('seo_semantics').select('*').eq('article_id', articleId),
            sc.supabase.from('seo_outline').select('*').eq('article_id', articleId),
            sc.supabase.from('seo_meta').select('*').eq('article_id', articleId).single(),
            sc.supabase.from('seo_scores').select('*').eq('article_id', articleId).single(),
        ]);
        return {
            keywords: keywords.data,
            semantics: semantics.data,
            outline: outline.data,
            meta: meta.data,
            score: score.data
        };
    },

    // Integrator Hub
    async getTenants() {
        const res = await request('/integrator/tenants');
        return res.json();
    },

    async getIntegrationEvents() {
        const res = await request('/integrator/events');
        return res.json();
    }
};
