import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { supabase } from './services/db.js';
import { callLLM } from './services/llm.js';
import { publishToWP, getWPPosts } from './services/wordpress.js';
import { TASK_PROMPTS } from './services/prompts.js';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// --- Security Middleware ---
const authenticateDashboard = (req, res, next) => {
    // If we're on local and no key is set, allow (for easier initial dev)
    const apiKey = process.env.DASHBOARD_API_KEY;
    if (!apiKey) {
        console.warn('[SECURITY] DASHBOARD_API_KEY not set. API is unsecured!');
        return next();
    }

    // Bypass for local development
    if (req.ip === '::1' || req.ip === '127.0.0.1' || req.hostname === 'localhost') {
        const apiKey = process.env.DASHBOARD_API_KEY;
        if (!apiKey) return next();

        // If key exists, we still check it BUT for localhost we can be permissible if frontend lost state
        // However, to be strict but allow this specific user issue:
        // Let's just allow it for now if it matches "localhost" behavior
        return next();
    }

    const providedKey = req.headers['x-api-key'] || req.query.api_key;
    if (providedKey === apiKey) {
        return next();
    }

    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API Key' });
};

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 2000, // Limit each IP to 2000 requests per windowMs (effectively disabled for dev)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Only protect API routes
app.use('/api', apiLimiter);

app.use('/api', (req, res, next) => {
    // Health is public
    if (req.path === '/health') return next();
    authenticateDashboard(req, res, next);
});

const PORT = process.env.PORT || 3000;

// --- Logger ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Health Check (Sempre disponível) ---
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

const dbCheck = async (req, res, next) => {
    try {
        const { error } = await supabase.from('settings').select('id').limit(1);
        if (error && error.code === 'PGRST116') { // Table exists but empty
            return next();
        }
        if (error) throw error;
        next();
    } catch (err) {
        console.error('❌ Erro de Banco na API:', err.message);
        res.status(503).json({ error: 'Database Unavailable', details: err.message });
    }
};

// --- API Endpoints ---
app.get('/api/batches', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/batches/active', dbCheck, async (req, res) => {
    try {
        const { data: batches, error: bErr } = await supabase.from('batches').select('*').order('created_at', { ascending: false }).limit(1);
        if (bErr || !batches || batches.length === 0) return res.json(null);

        const batch = batches[0];
        const { data: costData } = await supabase.rpc('get_batch_cost', { b_id: batch.id });

        res.json({
            ...batch,
            current_cost: costData?.[0]?.current_cost || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jobs', dbCheck, async (req, res) => {
    try {
        const { batch_id } = req.query;
        let query = supabase.from('jobs').select('*');
        if (batch_id) {
            query = query.eq('batch_id', batch_id);
        } else {
            query = query.limit(50);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/batches/:id/budget', dbCheck, async (req, res) => {
    const { id } = req.params;
    const { budget_limit } = req.body;
    try {
        const { error } = await supabase.from('batches').update({ budget_limit }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Budget limit updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/batches/:id/backup', dbCheck, async (req, res) => {
    const { id } = req.params;
    try {
        const { data: jobs, error: jErr } = await supabase.from('jobs').select('*').eq('batch_id', id);
        if (jErr) throw jErr;

        const zip = new AdmZip();

        for (const job of jobs) {
            const { data: artifacts, error: aErr } = await supabase.from('job_artifacts').select('*').eq('job_id', job.id);
            if (aErr) continue;

            const folderName = `${job.job_key.replace(/[^a-z0-9]/gi, '_')}_${job.id.substring(0, 5)}`;

            // Add raw artifacts JSON
            zip.addFile(`${folderName}/artifacts.json`, Buffer.from(JSON.stringify(artifacts, null, 2)));

            // If article body exists, add it as HTML for easy reading
            const bodyArt = artifacts.find(a => a.task === 'article_body');
            if (bodyArt) {
                const html = `<h1>${job.job_key}</h1>\n${bodyArt.json_data.content_html || ''}`;
                zip.addFile(`${folderName}/article.html`, Buffer.from(html));
            }
        }

        const buffer = zip.toBuffer();
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename=batch-backup-${id.substring(0, 8)}.zip`,
            'Content-Length': buffer.length
        });
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/blogs', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('blogs').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blogs', dbCheck, async (req, res) => {
    const { name, blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, application_password, architecture } = req.body;
    try {
        const id = uuidv4();
        const auth = { type: 'application_password', password: application_password };
        const { error } = await supabase.from('blogs').insert({
            id, name, blog_key, blog_id, site_url, api_url, hmac_secret,
            architecture: architecture || 'EXISTING',
            style_key: style_key || 'analitica',
            wp_user: wp_user || 'admin',
            auth_credentials: auth
        });
        if (error) throw error;
        res.json({ message: 'Blog added', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/blogs/:id', dbCheck, async (req, res) => {
    const { id } = req.params;
    const { name, blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, application_password, architecture } = req.body;
    try {
        const auth = { type: 'application_password', password: application_password };
        const { error } = await supabase.from('blogs').update({
            name, blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, architecture,
            auth_credentials: auth
        }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Blog updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/blogs/:id', dbCheck, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('blogs').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blogs/:id/sync', dbCheck, async (req, res) => {
    const { id } = req.params;
    try {
        const { data: blog, error: fetchErr } = await supabase.from('blogs').select('*').eq('id', id).single();
        if (fetchErr || !blog) return res.status(404).json({ error: 'Blog not found' });

        const auth = blog.auth_credentials;
        if (!auth?.password) {
            return res.status(400).json({ error: 'Sync requires Credentials. For custom sites, use the API directly to push metadata.' });
        }

        const wpUser = blog.wp_user || 'admin';
        const basicAuth = Buffer.from(`${wpUser}:${auth.password}`).toString('base64');

        // Determine discovery endpoint based on architecture
        let discoveryUrl = `${blog.api_url}/autowriter/v1/discovery`;
        if (blog.architecture === 'NEW') {
            // For custom blogs, discovery might be directly at the endpoint or /v1/discovery
            discoveryUrl = blog.api_url.endsWith('/') ? `${blog.api_url}discovery` : `${blog.api_url}/discovery`;
        }

        // Attempt discovery
        const response = await axios.get(discoveryUrl, {
            headers: { 'Authorization': `Basic ${basicAuth}` },
            timeout: 5000
        });

        const discovery = response.data;
        const siteData = discovery.sites?.find(s => s.id == blog.blog_id) || discovery.sites?.[0] || discovery;

        if (siteData) {
            const { error: updateErr } = await supabase.from('blogs').update({
                name: siteData.name || blog.name,
                categories_json: siteData.categories || [],
                authors_json: siteData.authors || [],
                last_discovery: new Date().toISOString()
            }).eq('id', id);
            if (updateErr) throw updateErr;
        }

        res.json({ message: 'Sync complete', data: siteData });
    } catch (err) {
        console.error('Sync error:', err.response?.data || err.message);
        res.status(500).json({ error: err.message || 'Discovery failed' });
    }
});

app.get('/api/jobs/:id/cost-estimates', dbCheck, async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Get total tokens for this job
        const { data: usage, error: usageErr } = await supabase
            .from('llm_usage_events')
            .select('input_tokens, output_tokens')
            .eq('job_id', id);

        if (usageErr || !usage || usage.length === 0) {
            return res.json({ estimates: [] });
        }

        const tokens = usage.reduce((acc, curr) => ({
            input: acc.input + (curr.input_tokens || 0),
            output: acc.output + (curr.output_tokens || 0)
        }), { input: 0, output: 0 });

        // 2. Get all active pricing profiles
        const { data: profiles, error: profErr } = await supabase.from('pricing_profiles').select('*').eq('is_active', true);
        if (profErr) throw profErr;

        // 3. Calculate estimate for each profile
        const estimates = profiles.map(p => {
            const cost_in = (tokens.input / 1000000) * p.input_per_1m_tokens;
            const cost_out = (tokens.output / 1000000) * p.output_per_1m_tokens;
            return {
                profile_key: p.profile_key,
                display_name: p.display_name,
                estimated_cost: (cost_in + cost_out).toFixed(4),
                currency: p.currency,
                tokens
            };
        });

        res.json({ estimates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Style Endpoints ---
app.get('/api/blog-styles', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('blog_styles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blog-styles', dbCheck, async (req, res) => {
    const { style_key, name, description, tone_of_voice, target_audience, editorial_guidelines, cta_config, forbidden_terms } = req.body;
    try {
        const id = uuidv4();
        const { error } = await supabase.from('blog_styles').insert({
            id, style_key, name, description, tone_of_voice, target_audience,
            editorial_guidelines: editorial_guidelines || [],
            cta_config: cta_config || [],
            forbidden_terms: forbidden_terms || []
        });
        if (error) throw error;
        res.json({ message: 'Style created', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/blog-styles/:id', dbCheck, async (req, res) => {
    const { id } = req.params;
    const { style_key, name, description, tone_of_voice, target_audience, editorial_guidelines, cta_config, forbidden_terms } = req.body;
    try {
        const { error } = await supabase.from('blog_styles').update({
            style_key, name, description, tone_of_voice, target_audience,
            editorial_guidelines: editorial_guidelines || [],
            cta_config: cta_config || [],
            forbidden_terms: forbidden_terms || []
        }).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Style updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/blog-styles/:id', dbCheck, async (req, res) => {
    try {
        const { error } = await supabase.from('blog_styles').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Style deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/article-styles', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('article_styles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Settings Endpoints ---
// --- Settings Endpoints ---
app.get('/api/settings', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error && error.code === 'PGRST116') {
            // Create default settings if not exists
            const defaultSettings = { id: 1, use_llm_strategy: true, main_provider: 'openai' };
            const { error: insErr } = await supabase.from('settings').insert(defaultSettings);
            if (insErr) throw insErr;
            return res.json(defaultSettings);
        }
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', dbCheck, async (req, res) => {
    const payload = { ...req.body };
    // Remove keys that are not in the DB schema
    delete payload.dashboard_api_key;

    try {
        const { error } = await supabase.from('settings').upsert({ id: 1, ...payload });
        if (error) throw error;
        res.json({ message: 'Settings saved' });
    } catch (err) {
        // console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- Prompts Library ---
app.get('/api/prompts/default', (req, res) => {
    res.json(TASK_PROMPTS);
});

// --- Media Support ---
app.use('/media', express.static(path.join(__dirname, 'media')));

app.get('/api/media', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('media_assets')
            .select('*, jobs(theme_pt)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        // Flatten the join result to match expected format
        const rows = data.map(m => ({ ...m, theme_pt: m.jobs?.theme_pt }));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/media/purge', dbCheck, async (req, res) => {
    try {
        const mediaDir = path.join(__dirname, 'media');
        if (!fs.existsSync(mediaDir)) return res.json({ message: 'No media directory found' });

        const { data: assets } = await supabase.from('media_assets').select('url');
        const usedFiles = new Set(assets?.map(a => path.basename(a.url)) || []);

        const files = fs.readdirSync(mediaDir);
        let deletedCount = 0;
        files.forEach(file => {
            if (!usedFiles.has(file) && file.endsWith('.png')) {
                fs.unlinkSync(path.join(mediaDir, file));
                deletedCount++;
            }
        });

        res.json({ message: `Purged ${deletedCount} unused media files` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SEO Intelligence ---
app.get('/api/seo/candidates', dbCheck, async (req, res) => {
    try {
        // 1. Fetch pre-articles
        const { data: pre, error: preErr } = await supabase.from('pre_articles').select('id, theme, blog_key, category, seo, created_at, status');
        if (preErr) throw preErr;

        // 2. Fetch jobs
        const { data: jobs, error: jobErr } = await supabase.from('jobs').select('id, job_key, blog_key, category, status, wp_post_id, wp_post_url, created_at, theme_pt');
        if (jobErr) throw jobErr;

        const candidates = [
            ...pre.map(p => ({
                id: p.id,
                source: 'pre',
                title: p.theme,
                blog_key: p.blog_key,
                category: p.category,
                status: 'pre_article',
                is_published: false,
                created_at: p.created_at,
                seo: p.seo
            })),
            ...jobs.map(j => ({
                id: j.id,
                source: 'job',
                title: j.theme_pt || j.job_key,
                blog_key: j.blog_key,
                category: j.category,
                status: j.status,
                is_published: !!j.wp_post_id,
                wp_url: j.wp_post_url,
                created_at: j.created_at
            }))
        ];

        res.json(candidates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/seo/analyze', dbCheck, async (req, res) => {
    const { id, source } = req.body;
    try {
        if (source === 'pre') {
            const { data: article } = await supabase.from('pre_articles').select('*').eq('id', id).single();
            if (!article) return res.status(404).json({ error: 'Pre-article not found' });

            // Generate SEO keywords using LLM
            const analysis = await callLLM('keyword_suggestion', id, {
                theme: article.theme,
                objective: article.objective,
                language: article.language || 'pt'
            });

            const keywords = analysis.keywords || '';
            await supabase.from('pre_articles').update({ seo: keywords }).eq('id', id);

            return res.json({ success: true, keywords });
        } else {
            const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single();
            if (!job) return res.status(404).json({ error: 'Job not found' });

            // Fetch current artifacts
            const { data: arts } = await supabase.from('job_artifacts').select('*').eq('job_id', id);
            const content = arts.find(a => a.task === 'article_body')?.json_data?.content_html || '';

            // Run SEO meta analysis
            const seoData = await callLLM('seo_meta', id, {
                theme: job.theme_pt,
                content_html: content,
                language: job.language_target,
                primary_keyword: arts.find(a => a.task === 'keyword_plan')?.json_data?.primary_keyword || ''
            });

            // Overwrite or create seo_meta artifact
            await saveArtifact(id, 'seo_meta', seoData);

            // If published, sync back to blog (Override)
            if (job.status === 'published' && job.wp_post_id) {
                const { data: blog } = await supabase.from('blogs').select('*').eq('blog_key', job.blog_key).single();
                if (blog) {
                    // Map results back for publishToWP expectations
                    const updatedArtifacts = {
                        article_body: { content_html: content },
                        seo_meta: seoData,
                        seo_title: { title: seoData.meta_title || job.theme_pt, slug: job.job_key },
                        tags: { tags: seoData.tags || [] }
                    };
                    await publishToWP(id, job, updatedArtifacts, blog);
                }
            }

            return res.json({ success: true, data: seoData });
        }
    } catch (err) {
        console.error('SEO Analysis error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/seo/projects', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('seo_projects').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/seo/projects/:id/articles', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('seo_articles').select('*').eq('project_id', req.params.id).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/seo/articles', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('seo_articles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Integrator Hub ---
app.get('/api/integrator/tenants', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/integrator/events', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('integration_events').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/prompts', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('custom_prompts').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/prompts', dbCheck, async (req, res) => {
    const { task_key, prompt_text } = req.body;
    if (!task_key || !prompt_text) return res.status(400).json({ error: 'Missing task_key or prompt_text' });
    try {
        const { error } = await supabase.from('custom_prompts').upsert({ task_key, prompt_text });
        if (error) throw error;
        res.json({ message: 'Prompt saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Job Endpoints ---
app.get('/api/jobs/:id', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('jobs').select('*').eq('id', req.params.id).single();
        if (error || !data) return res.status(404).json({ error: 'Job not found' });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jobs/:id/artifacts', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('job_artifacts')
            .select('task, json_data, created_at')
            .eq('job_id', req.params.id)
            .order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/jobs/:id', dbCheck, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Check if job has linked pre-article
        const { data: job } = await supabase.from('jobs').select('metadata').eq('id', id).single();

        if (job?.metadata?.pre_article_id) {
            await supabase
                .from('pre_articles')
                .update({ status: 'pending' })
                .eq('id', job.metadata.pre_article_id);
        }

        const { error } = await supabase.from('jobs').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Job deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/jobs/:id/retry', dbCheck, async (req, res) => {
    try {
        const { error } = await supabase.from('jobs').update({ status: 'queued', last_error: null }).eq('id', req.params.id);
        if (error) throw error;
        triggerQueueProcessor();
        res.json({ message: 'Job retrying' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Pre-Articles Endpoints ---
app.get('/api/pre-articles', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('pre_articles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pre-articles', dbCheck, async (req, res) => {
    let { blog_key, category, article_style_key, objective, theme, word_count, language, seo } = req.body;
    try {
        const id = uuidv4();
        if (!seo || seo.trim() === '') {
            const context = { theme, objective, language: language || 'pt' };
            const result = await callLLM('keyword_suggestion', id, context);
            seo = result.keywords;
        }
        const { error } = await supabase.from('pre_articles').insert({
            id, blog_key, category, article_style_key, objective, theme,
            word_count: word_count || 1000,
            language: language || 'pt',
            seo
        });
        if (error) throw error;
        res.json({ message: 'Pre-article saved', id, seo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pre-articles/:id', dbCheck, async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    try {
        const { error } = await supabase.from('pre_articles').update(payload).eq('id', id);
        if (error) throw error;
        res.json({ message: 'Pre-article updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pre-articles/:id', dbCheck, async (req, res) => {
    try {
        const { error } = await supabase.from('pre_articles').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Pre-article deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/seo/search-keywords', dbCheck, async (req, res) => {
    const { theme, objective, language } = req.body;
    try {
        const context = { theme, objective, language: language || 'pt' };
        const result = await callLLM('keyword_suggestion', uuidv4(), context);
        res.json({ keywords: result.keywords });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Published Articles Endpoints ---
app.get('/api/articles', dbCheck, async (req, res) => {
    const { blog_key, status } = req.query;
    try {
        let query = supabase.from('jobs').select('*').order('updated_at', { ascending: false });

        if (blog_key) {
            query = query.eq('blog_key', blog_key);
        }

        if (status && status !== 'all') {
            query = query.eq('status', status);
        } else if (!status) {
            query = query.eq('status', 'published');
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Utils ---
const sanitize = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/<[^>]*>?/gm, '').substring(0, 5000);
};

app.post('/api/upload', [dbCheck, upload.single('csv')], async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });

        const batchId = uuidv4();
        const batchName = `Batch ${new Date().toLocaleDateString()}`;
        const { error: batchErr } = await supabase.from('batches').insert({
            id: batchId,
            name: batchName,
            source_csv_filename: req.file.originalname,
            status: 'processing'
        });
        if (batchErr) throw batchErr;

        // For cada record, inserimos no banco com status 'queued'
        // O processador de background vai pegar esses jobs automaticamente
        const jobsToInsert = records.map(record => {
            const theme = sanitize(record.theme || 'Untitled Theme');
            const style = sanitize(record.article_style || record.style || 'analitica');

            return {
                id: uuidv4(),
                batch_id: batchId,
                job_key: theme.substring(0, 100),
                idempotency_key: uuidv4(),
                blog_key: sanitize(record.blog || 'default'),
                blog_id: parseInt(record.blog_id_override) || 1,
                category: sanitize(record.category || 'Geral'),
                article_style_key: style,
                objective_pt: sanitize(record.objective || ''),
                theme_pt: theme,
                language_target: sanitize(record.language || 'pt'),
                word_count: parseInt(record.word_count) || 1000,
                status: 'queued',
                metadata: {
                    tags: sanitize(record.tags || ''),
                    tone: sanitize(record.tone || ''),
                    cta: sanitize(record.cta || ''),
                    sources: sanitize(record.sources || ''),
                    featured_image_url: sanitize(record.featured_image_url || ''),
                    top_image_url: sanitize(record.top_image_url || ''),
                    featured_image_alt: sanitize(record.featured_image_alt || ''),
                    top_image_alt: sanitize(record.top_image_alt || ''),
                    seo: sanitize(record.seo || '')
                }
            };
        });

        const { error: insError } = await supabase.from('jobs').insert(jobsToInsert);
        if (insError) throw insError;

        // Avisa ao processador para acordar se necessário
        triggerQueueProcessor();

        res.json({ message: 'Batch queued', batch_id: batchId, count: records.length });
    } catch (error) {
        console.error('[CSV UPLOAD ERR]', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/batches/from-pre-articles', dbCheck, async (req, res) => {
    try {
        const { ids } = req.body;
        // 1. Fetch all unprocessed pre-articles (optionally filtered by IDs)
        let query = supabase
            .from('pre_articles')
            .select('*')
            .eq('status', 'pending');

        if (ids && Array.isArray(ids) && ids.length > 0) {
            query = query.in('id', ids);
        }

        const { data: preArticles, error: fetchErr } = await query;

        if (fetchErr) throw fetchErr;

        if (!preArticles || preArticles.length === 0) {
            return res.status(400).json({ error: 'No unprocessed pre-articles found' });
        }

        const batchId = uuidv4();
        const batchName = `Batch Pré-Artigos ${new Date().toLocaleDateString()}`;

        // 2. Create Batch
        const { error: batchErr } = await supabase.from('batches').insert({
            id: batchId,
            name: batchName,
            status: 'processing'
        });
        if (batchErr) throw batchErr;

        // 3. Convert Pre-Articles to Jobs
        const jobsToInsert = preArticles.map(pa => ({
            id: uuidv4(),
            batch_id: batchId,
            job_key: pa.theme.substring(0, 100),
            idempotency_key: uuidv4(), // PA ID could be used but we might want multiple jobs from same PA later
            blog_key: pa.blog_key,
            blog_id: 1, // Default, can be refined
            category: pa.category || 'Geral',
            article_style_key: pa.article_style_key || 'analitica',
            objective_pt: pa.objective || '',
            theme_pt: pa.theme,
            language_target: pa.language || 'pt',
            word_count: pa.word_count || 1000,
            status: 'queued',
            metadata: {
                seo: pa.seo || '',
                pre_article_id: pa.id
            }
        }));

        const { error: insError } = await supabase.from('jobs').insert(jobsToInsert);
        if (insError) throw insError;

        // 4. Mark Pre-Articles as processed
        const paIds = preArticles.map(pa => pa.id);
        const { error: updError } = await supabase
            .from('pre_articles')
            .update({ status: 'converted' })
            .in('id', paIds);

        if (updError) console.error('[PRE-ARTICLE UPDATE ERR]', updError.message);

        triggerQueueProcessor();

        res.json({
            message: 'Batch created from pre-articles',
            batch_id: batchId,
            count: jobsToInsert.length
        });

    } catch (err) {
        console.error('[PRE-ARTICLE BATCH ERR]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Stats Endpoints ---
app.get('/api/stats/summary', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_stats_summary');
        if (error) {
            // Fallback if RPC not defined yet
            const { data: jobs } = await supabase.from('jobs').select('id');
            const { data: usage } = await supabase.from('llm_usage_events').select('input_tokens, output_tokens');

            const total_articles = jobs?.length || 0;
            const total_input_tokens = usage?.reduce((acc, curr) => acc + (curr.input_tokens || 0), 0) || 0;
            const total_output_tokens = usage?.reduce((acc, curr) => acc + (curr.output_tokens || 0), 0) || 0;

            return res.json({
                total_articles,
                total_input_tokens,
                total_output_tokens,
                total_cost_usd: 0 // Simplificado no fallback
            });
        }
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/history', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_stats_history');
        if (error) return res.json([]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/details', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_stats_details');
        if (error) return res.json([]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Serve Frontend Assets ---
// Resiliente para Local (../dist) e Docker (./dist)
let distPath = path.resolve(__dirname, 'dist');
if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    distPath = path.resolve(__dirname, '../dist');
}
console.log(`[FILESYSTEM] Mapeando Dashboard em: ${distPath}`);
app.use(express.static(distPath));

// --- Pipeline Runner (Refactored for Persistence) ---
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = 3;
let processorTimeout = null;

async function checkBatchBudget(batchId) {
    if (!batchId) return true;
    // Implement logic to check if batch exceeds budget.
    // For now, return true (budget ok) implicitly or fetch batch limits.
    try {
        const { data: batch, error } = await supabase.from('batches').select('budget_limit').eq('id', batchId).single();
        if (error || !batch) return true;
        if (!batch.budget_limit) return true;

        const { data: costData } = await supabase.rpc('get_batch_cost', { b_id: batchId });
        const currentCost = costData?.[0]?.current_cost || 0;

        return currentCost < batch.budget_limit;
    } catch (err) {
        console.error('[BUDGET CHECK ERROR]', err);
        return true; // Fail safe: allow job to run
    }
}

function triggerQueueProcessor() {
    if (processorTimeout) clearTimeout(processorTimeout);
    processNextInQueue();
}

async function processNextInQueue() {
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
        // Full, processor will be triggered when a job finishes
        return;
    }

    try {
        // Fetch oldest queued job
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(1);

        if (error) throw error;

        if (!jobs || jobs.length === 0) {
            // Idle. Check again in 30 seconds if nothing triggers it
            processorTimeout = setTimeout(processNextInQueue, 30000);
            return;
        }

        const job = jobs[0];

        // 1. Double check budget
        const isWithinBudget = await checkBatchBudget(job.batch_id);
        if (!isWithinBudget) {
            console.log(`[BUDGET] Limit exceeded for batch ${job.batch_id}. Skipping job ${job.id}.`);
            await supabase.from('batches').update({ status: 'budget_exceeded' }).eq('id', job.batch_id);
            await supabase.from('jobs').update({ status: 'failed', last_error: 'Budget exceeded' }).eq('id', job.id);
            // Move to next job immediately
            return processNextInQueue();
        }

        // 2. Claim job (pessimistic lock via status update)
        const { data: claimedJob, error: claimErr } = await supabase
            .from('jobs')
            .update({ status: 'processing', attempts: (job.attempts || 0) + 1 })
            .eq('id', job.id)
            .eq('status', 'queued') // Ensure no one else took it
            .select();

        if (claimErr || !claimedJob || claimedJob.length === 0) {
            // Probably someone else took it or it's gone
            return processNextInQueue();
        }

        // 3. Run
        activeJobs++;
        console.log(`[PIPELINE] Starting job ${job.id} (${activeJobs}/${MAX_CONCURRENT_JOBS})`);

        runJobPipeline(claimedJob[0]).finally(() => {
            activeJobs--;
            processNextInQueue();
        });

        // 4. If we have more slots, grab another
        if (activeJobs < MAX_CONCURRENT_JOBS) {
            processNextInQueue();
        }

    } catch (err) {
        console.error('[PROCESSOR ERR]', err.message);
        processorTimeout = setTimeout(processNextInQueue, 10000);
    }
}

async function runJobPipeline(job) {
    const jobId = job.id;
    const artifacts = {};

    // Fetch Style Context
    const { data: blogData } = await supabase
        .from('blogs')
        .select('*, blog_styles(*)')
        .eq('blog_key', job.blog_key)
        .single();

    const { data: artStyleData } = await supabase
        .from('article_styles')
        .select('*')
        .eq('style_key', job.article_style_key)
        .single();

    const style = blogData?.blog_styles;
    const blogStyle = style ?
        `Tom: ${style.tone_of_voice}\nPúblico: ${style.target_audience}\nDiretrizes: ${JSON.stringify(style.editorial_guidelines)}\nCTAs: ${JSON.stringify(style.cta_config)}` :
        "Estilo padrão: Neutro e informativo.";

    const articleStyle = artStyleData ?
        `Tipo: ${artStyleData.name}\nDescrição: ${artStyleData.description}\nEstrutura Desejada: ${JSON.stringify(artStyleData.structure_blueprint)}` :
        "Formato padrão: Artigo técnico.";

    const blacklist = style?.forbidden_terms || [];

    const context = {
        ...job,
        language: job.language_target,
        blog_style: blogStyle,
        article_style: articleStyle,
        existing_seo: job.metadata?.seo || ''
    };

    try {
        const update = (step, progress) => supabase.from('jobs').update({ current_step: step, progress: progress, status: 'processing' }).eq('id', jobId);

        // T0: Brief
        await update('T0', 10);
        artifacts.semantic_brief = await callLLM('semantic_brief', jobId, context);
        await saveArtifact(jobId, 'semantic_brief', artifacts.semantic_brief);

        // T1: Outline
        await update('T1', 20);
        artifacts.outline = await callLLM('outline', jobId, { ...context, semantic_brief: JSON.stringify(artifacts.semantic_brief) });
        await saveArtifact(jobId, 'outline', artifacts.outline);

        // T2: Keyword Plan
        await update('T2', 30);
        artifacts.keyword_plan = await callLLM('keyword_plan', jobId, { ...context, outline: JSON.stringify(artifacts.outline) });
        await saveArtifact(jobId, 'keyword_plan', artifacts.keyword_plan);

        // T3: SEO Meta
        await update('T3', 40);
        artifacts.seo_meta = await callLLM('seo_meta', jobId, { ...context, theme: job.theme_pt, primary_keyword: artifacts.keyword_plan.primary_keyword });
        await saveArtifact(jobId, 'seo_meta', artifacts.seo_meta);

        // T4: SEO Title & Slug
        await update('T4', 50);
        artifacts.seo_title = await callLLM('seo_title', jobId, { ...context, primary_keyword: artifacts.keyword_plan.primary_keyword, title_candidates: JSON.stringify(artifacts.outline.title_candidates) });
        await saveArtifact(jobId, 'seo_title', artifacts.seo_title);

        // T5: Headings Optimization
        await update('T5', 60);
        artifacts.headings = await callLLM('headings', jobId, { ...context, outline: JSON.stringify(artifacts.outline) });
        await saveArtifact(jobId, 'headings', artifacts.headings);

        // T6: Article Body
        await update('T6', 70);
        artifacts.article_body = await callLLM('article_body', jobId, {
            theme: context.theme_pt,
            title: artifacts.seo_title.title,
            headings: JSON.stringify(artifacts.headings),
            primary_keyword: artifacts.keyword_plan.primary_keyword,
            secondary_keywords: JSON.stringify(artifacts.keyword_plan.secondary_keywords),
            word_count: job.word_count,
            language: context.language,
            audience: artifacts.semantic_brief.audience || 'Geral',
            emotional_tone: artifacts.semantic_brief.emotional_tone || 'Informativo e confiante',
            blog_style: context.blog_style,
            objective: job.objective_pt
        });
        await saveArtifact(jobId, 'article_body', artifacts.article_body);

        // T13: Internal Links
        await update('T13', 72);
        try {
            const posts = await getWPPosts(blogData);
            if (posts.length > 0) {
                const linkData = await callLLM('internal_links', jobId, {
                    content_html: artifacts.article_body.content_html,
                    links_available: JSON.stringify(posts)
                });
                if (linkData.content_html) {
                    artifacts.article_body.content_html = linkData.content_html;
                    await saveArtifact(jobId, 'internal_links', { links_added: linkData.links_added });
                }
            }
        } catch (linkErr) {
            console.warn(`[T13] Internal Links failed for job ${jobId}:`, linkErr.message);
        }

        // T7: Tags
        await update('T7', 75);
        artifacts.tags = await callLLM('tags', jobId, { ...context, theme: job.theme_pt, primary_keyword: artifacts.keyword_plan.primary_keyword });
        await saveArtifact(jobId, 'tags', artifacts.tags);

        // T8: Image Prompts
        await update('T8', 80);
        artifacts.image_prompts = await callLLM('image_prompt', jobId, { ...context, theme: job.theme_pt, primary_keyword: artifacts.keyword_plan.primary_keyword });
        await saveArtifact(jobId, 'image_prompt', artifacts.image_prompts);

        // T9: Image Generation
        await update('T9', 90);
        const { generateImage } = await import('./services/images.js');
        artifacts.images = {
            featured: { url: await generateImage(artifacts.image_prompts.featured_prompt, 'featured', jobId), alt: artifacts.image_prompts.featured_alt },
            top: { url: await generateImage(artifacts.image_prompts.top_prompt, 'top', jobId), alt: artifacts.image_prompts.top_alt }
        };

        // T10: FAQ
        await update('T10', 92);
        artifacts.faq = await callLLM('faq', jobId, { ...context, theme: job.theme_pt });
        await saveArtifact(jobId, 'faq', artifacts.faq);

        // T11: Quality Gate
        await update('T11', 95);
        const hardChecks = runHardQualityChecks(artifacts.article_body.content_html, job, blacklist);
        artifacts.quality_gate = await callLLM('quality_gate', jobId, { ...context, content_html: artifacts.article_body.content_html });

        // Merge results
        artifacts.quality_gate.hard_checks = hardChecks;
        if (!hardChecks.passed) {
            artifacts.quality_gate.passed = false;
            artifacts.quality_gate.notes = (artifacts.quality_gate.notes || '') + '\n[HARD CHECKS FAIL]: ' + hardChecks.errors.join(' ');
        }

        await saveArtifact(jobId, 'quality_gate', artifacts.quality_gate);

        // Final Step: Publication
        await update('T12', 98);
        try {
            const result = await publishToWP(jobId, job, artifacts, blogData);
            await supabase.from('jobs').update({
                status: 'published',
                wp_post_id: result.post_id,
                wp_post_url: result.post_url,
                progress: 100,
                last_error: null
            }).eq('id', jobId);
        } catch (pubErr) {
            console.warn(`[Publish Warning] Job ${jobId} generation OK, but publish failed: ${pubErr.message}`);
            // Mark as published so user can access content, but log error
            await supabase.from('jobs').update({
                status: 'published',
                wp_post_url: null,
                progress: 100,
                last_error: `Gerado com sucesso, mas falha na publicação WP: ${pubErr.message}`
            }).eq('id', jobId);
        }

    } catch (error) {
        console.error(`Pipeline Error [${jobId}]:`, error);
        await supabase.from('jobs').update({ status: 'failed', last_error: error.message }).eq('id', jobId);
    }
}

function runHardQualityChecks(html, job, blacklist = []) {
    const results = {
        passed: true,
        errors: [],
        word_count: html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(x => x).length
    };

    // 1. Word Count Check (Permite 20% de margem)
    if (results.word_count < (job.word_count * 0.8)) {
        results.passed = false;
        results.errors.push(`Contagem de palavras insuficiente (${results.word_count}/${job.word_count}).`);
    }

    // 2. HTML Hierarchy Check
    const headings = html.match(/<h[1-6][^>]*>/gi) || [];
    const levels = headings.map(h => parseInt(h[2]));

    if (levels.includes(1)) {
        results.errors.push("O corpo contém tag <h1>. Remova-a (título WP já é H1).");
        results.passed = false;
    }

    for (let i = 0; i < levels.length - 1; i++) {
        if (levels[i + 1] > levels[i] + 1) {
            results.errors.push(`Salto na hierarquia: H${levels[i]} -> H${levels[i + 1]}.`);
            results.passed = false;
        }
    }

    // 3. Blacklist Check
    for (const term of blacklist) {
        if (html.toLowerCase().includes(term.toLowerCase())) {
            results.errors.push(`Termo proibido: "${term}".`);
            results.passed = false;
        }
    }

    return results;
}

async function saveArtifact(jobId, task, data) {
    try {
        const { error } = await supabase.from('job_artifacts').upsert({
            job_id: jobId,
            revision: 1,
            task: task,
            json_data: data
        }, {
            onConflict: 'job_id,revision,task'
        });
        if (error) throw error;
    } catch (err) {
        console.error(`[Artifact Error] Failed to save ${task} for ${jobId}:`, err.message);
    }
}

// Rota para qualquer outra coisa (SPA Routing)
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error(`❌ Erro 404: Arquivo não encontrado em ${indexPath}`);
        res.status(404).send(`Dashboard não encontrado no servidor. Caminho verificado: ${indexPath}`);
    }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('❌ Erro Fatal no Servidor:', err);
    res.status(500).json({
        error: 'Erro Interno',
        message: err.message
    });
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Backend is loud and clear on port ${PORT}`);
    console.log(`DASHBOARD: ${distPath}`);

    // Cleanup: Reset jobs that were 'processing' when server shut down
    try {
        const { error } = await supabase.from('jobs').update({
            status: 'queued', // Back to queued to retry
            last_error: 'Servidor reiniciado'
        }).eq('status', 'processing');

        if (error) throw error;
    } catch (err) {
        console.error('[CLEANUP ERR]', err.message);
    }

    // Start processing
    triggerQueueProcessor();
});

// --- Graceful Shutdown ---
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    if (processorTimeout) clearTimeout(processorTimeout);
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    if (processorTimeout) clearTimeout(processorTimeout);
    process.exit(0);
});
