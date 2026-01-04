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

    async updateSettings(settings: any) {
        const res = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
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
    }
};
