import { Job, Stat } from '../types';

const API_BASE = '/api';

export const api = {
    async getBatches() {
        const res = await fetch(`${API_BASE}/batches`);
        return res.json();
    },

    async getJobs(batchId?: string) {
        const url = batchId ? `${API_BASE}/jobs?batch_id=${batchId}` : `${API_BASE}/jobs`;
        const res = await fetch(url);
        return res.json();
    },

    async getSettings() {
        const res = await fetch(`${API_BASE}/settings`);
        return res.json();
    },
    async getJobCostEstimates(id: string) {
        const res = await fetch(`${API_BASE}/jobs/${id}/cost-estimates`);
        return res.json();
    },

    async updateSettings(settings: any) {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return res.json();
    },

    async getJobById(id: string): Promise<Job> {
        const res = await fetch(`${API_BASE}/jobs/${id}`);
        return res.json();
    },

    async getJobArtifacts(id: string) {
        const res = await fetch(`${API_BASE}/jobs/${id}/artifacts`);
        return res.json();
    },

    async deleteJob(id: string) {
        const res = await fetch(`${API_BASE}/jobs/${id}`, { method: 'DELETE' });
        return res.json();
    },
    async retryJob(id: string) {
        const res = await fetch(`${API_BASE}/jobs/${id}/retry`, { method: 'POST' });
        return res.json();
    },

    async uploadCSV(data: FormData) {
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: data,
        });
        return res.json();
    },

    async getBlogs() {
        const res = await fetch(`${API_BASE}/blogs`);
        return res.json();
    },

    async addBlog(blogData: any) {
        const res = await fetch(`${API_BASE}/blogs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blogData),
        });
        return res.json();
    },

    async syncBlog(id: string) {
        const res = await fetch(`${API_BASE}/blogs/${id}/sync`, { method: 'POST' });
        return res.json();
    },
    async updateBlog(id: string, blogData: any) {
        const res = await fetch(`${API_BASE}/blogs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blogData),
        });
        return res.json();
    },
    async deleteBlog(id: string) {
        const res = await fetch(`${API_BASE}/blogs/${id}`, { method: 'DELETE' });
        return res.json();
    },
    async getStatsSummary() {
        const res = await fetch(`${API_BASE}/stats/summary`);
        return res.json();
    },
    async getStatsHistory() {
        const res = await fetch(`${API_BASE}/stats/history`);
        return res.json();
    },
    async getStatsDetails() {
        const res = await fetch(`${API_BASE}/stats/details`);
        return res.json();
    },
    async updateBatchBudget(id: string, budget: number) {
        const res = await fetch(`${API_BASE}/batches/${id}/budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budget_limit: budget }),
        });
        return res.json();
    },
    async getActiveBatch() {
        const res = await fetch(`${API_BASE}/batches/active`);
        return res.json();
    },
    async getDefaultPrompts() {
        const res = await fetch(`${API_BASE}/prompts/default`);
        return res.json();
    },
    async getCustomPrompts() {
        const res = await fetch(`${API_BASE}/prompts`);
        return res.json();
    },
    async saveCustomPrompt(taskKey: string, text: string) {
        const res = await fetch(`${API_BASE}/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_key: taskKey, prompt_text: text }),
        });
        return res.json();
    },
    async getBlogStyles() {
        const res = await fetch(`${API_BASE}/blog-styles`);
        return res.json();
    },
    async addBlogStyle(styleData: any) {
        const res = await fetch(`${API_BASE}/blog-styles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(styleData),
        });
        return res.json();
    },
    async updateBlogStyle(id: string, styleData: any) {
        const res = await fetch(`${API_BASE}/blog-styles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(styleData),
        });
        return res.json();
    },
    async deleteBlogStyle(id: string) {
        const res = await fetch(`${API_BASE}/blog-styles/${id}`, { method: 'DELETE' });
        return res.json();
    },
    async getArticleStyles() {
        const res = await fetch(`${API_BASE}/article-styles`);
        return res.json();
    },
    async getMedia() {
        const res = await fetch(`${API_BASE}/media`);
        return res.json();
    },
    getBatchBackupUrl(batchId: string) {
        return `${API_BASE}/batches/${batchId}/backup`;
    },

    // Pre-Articles
    async getPreArticles() {
        const res = await fetch(`${API_BASE}/pre-articles`);
        return res.json();
    },
    async savePreArticle(data: any) {
        const res = await fetch(`${API_BASE}/pre-articles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async updatePreArticle(id: string, data: any) {
        const res = await fetch(`${API_BASE}/pre-articles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    async deletePreArticle(id: string) {
        const res = await fetch(`${API_BASE}/pre-articles/${id}`, { method: 'DELETE' });
        return res.json();
    },
    async searchKeywords(data: { theme: string, objective: string, language: string }) {
        const res = await fetch(`${API_BASE}/seo/search-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    // Published Articles
    async getPublishedArticles(blogKey?: string) {
        const url = blogKey ? `${API_BASE}/articles?blog_key=${blogKey}` : `${API_BASE}/articles`;
        const res = await fetch(url);
        return res.json();
    },

    async logout() {
        const { supabase } = await import('./supabaseClient');
        return supabase.auth.signOut();
    }
};
