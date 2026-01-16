import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
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
    const { blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, application_password } = req.body;
    try {
        const id = uuidv4();
        const auth = { type: 'application_password', password: application_password };
        const { error } = await supabase.from('blogs').insert({
            id, blog_key, blog_id, site_url, api_url, hmac_secret,
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
    const { blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, application_password } = req.body;
    try {
        const auth = { type: 'application_password', password: application_password };
        const { error } = await supabase.from('blogs').update({
            blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user,
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
        const basicAuth = Buffer.from(`admin:${auth.password}`).toString('base64');

        const response = await axios.get(`${blog.api_url}/autowriter/v1/discovery`, {
            headers: { 'Authorization': `Basic ${basicAuth}` }
        });

        const discovery = response.data;
        // Search for the specific blog_id in the multisite response
        const siteData = discovery.sites.find(s => s.id == blog.blog_id) || discovery.sites[0];

        if (siteData) {
            const { error: updateErr } = await supabase.from('blogs').update({
                name: siteData.name,
                categories_json: siteData.categories,
                authors_json: siteData.authors,
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
        const [rows] = await pool.query('SELECT * FROM blog_styles ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blog-styles', dbCheck, async (req, res) => {
    const { style_key, name, description, tone_of_voice, target_audience, editorial_guidelines, cta_config, forbidden_terms } = req.body;
    try {
        const id = uuidv4();
        await pool.query(
            'INSERT INTO blog_styles (id, style_key, name, description, tone_of_voice, target_audience, editorial_guidelines, cta_config, forbidden_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, style_key, name, description, tone_of_voice, target_audience, JSON.stringify(editorial_guidelines || []), JSON.stringify(cta_config || []), JSON.stringify(forbidden_terms || [])]
        );
        res.json({ message: 'Style created', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/blog-styles/:id', dbCheck, async (req, res) => {
    const { id } = req.params;
    const { style_key, name, description, tone_of_voice, target_audience, editorial_guidelines, cta_config, forbidden_terms } = req.body;
    try {
        await pool.query(
            'UPDATE blog_styles SET style_key = ?, name = ?, description = ?, tone_of_voice = ?, target_audience = ?, editorial_guidelines = ?, cta_config = ?, forbidden_terms = ? WHERE id = ?',
            [style_key, name, description, tone_of_voice, target_audience, JSON.stringify(editorial_guidelines || []), JSON.stringify(cta_config || []), JSON.stringify(forbidden_terms || []), id]
        );
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
app.get('/api/settings', dbCheck, async (req, res) => {
    try {
        const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (error && error.code === 'PGRST116') {
            const { error: insErr } = await supabase.from('settings').insert({ id: 1 });
            if (insErr) throw insErr;
            return res.json({});
        }
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', dbCheck, async (req, res) => {
    const payload = req.body;
    try {
        const { error } = await supabase.from('settings').upsert({ id: 1, ...payload });
        if (error) throw error;
        res.json({ message: 'Settings saved' });
    } catch (err) {
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
        const { error } = await supabase.from('jobs').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Job deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/jobs/:id/retry', dbCheck, async (req, res) => {
    try {
        await pool.query('UPDATE jobs SET status = \'queued\', last_error = NULL WHERE id = ?', [req.params.id]);
        processNextInQueue();
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
    const { blog_key } = req.query;
    try {
        let query = supabase.from('jobs').select('*').eq('status', 'published').order('updated_at', { ascending: false });
        if (blog_key) {
            query = query.eq('blog_key', blog_key);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

        for (const record of records) {
            const metadata = {
                tags: record.tags || '',
                tone: record.tone || '',
                cta: record.cta || '',
                sources: record.sources || '',
                featured_image_url: record.featured_image_url || '',
                top_image_url: record.top_image_url || '',
                featured_image_alt: record.featured_image_alt || '',
                top_image_alt: record.top_image_alt || '',
                seo: record.seo || ''
            };

            const theme = record.theme || 'Untitled Theme';
            const style = record.article_style || record.style || 'analitica';

            const { error: jobErr } = await supabase.from('jobs').insert({
                id: uuidv4(),
                batch_id: batchId,
                job_key: theme.substring(0, 100),
                idempotency_key: uuidv4(),
                blog_key: record.blog || 'default',
                blog_id: parseInt(record.blog_id_override) || 1,
                category: record.category || 'Geral',
                article_style_key: style,
                objective_pt: record.objective || '',
                theme_pt: theme,
                language_target: record.language || 'pt',
                word_count: parseInt(record.word_count) || 1000,
                metadata: metadata
            });
            if (jobErr) console.error('Error inserting job from CSV:', jobErr);
        }

        processBatchBackground(batchId);
        res.json({ message: 'Batch queued', batch_id: batchId });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// --- Pipeline Runner ---
// Usando um semáforo manual para evitar sobrecarregar a API de LLM (max 3 jobs simultâneos)
let activeJobs = 0;
const jobQueue = [];

async function processBatchBackground(batchId) {
    const { data: jobs } = await supabase.from('jobs').select('*').eq('batch_id', batchId);
    if (jobs) {
        for (const job of jobs) {
            jobQueue.push(job);
        }
        processNextInQueue();
    }
}

async function checkBatchBudget(batchId) {
    const { data: batch } = await supabase.from('batches').select('budget_limit').eq('id', batchId).single();
    const limit = batch?.budget_limit;
    if (limit === null || limit === undefined) return true;

    const { data: costData } = await supabase.rpc('get_batch_cost', { b_id: batchId });
    const currentCost = costData?.[0]?.current_cost || 0;

    return currentCost < parseFloat(limit);
}

async function processNextInQueue() {
    if (activeJobs >= 3 || jobQueue.length === 0) return;

    const job = jobQueue[0]; // Espia o próximo
    const isWithinBudget = await checkBatchBudget(job.batch_id);

    if (!isWithinBudget) {
        console.log(`[BUDGET] Limite de gastos atingido para o batch ${job.batch_id}. Pausando jobs deste batch.`);
        await supabase.from('batches').update({ status: 'budget_exceeded' }).eq('id', job.batch_id);
        return;
    }

    jobQueue.shift(); // Remove de fato
    activeJobs++;

    runJobPipeline(job).finally(() => {
        activeJobs--;
        processNextInQueue();
    });

    // Tenta rodar outro se houver slots
    processNextInQueue();
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
        article_style: articleStyle
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
            language: context.language
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
        const result = await publishToWP(jobId, job, artifacts, blogData);

        await supabase.from('jobs').update({
            status: 'published',
            wp_post_id: result.post_id,
            wp_post_url: result.post_url,
            progress: 100
        }).eq('id', jobId);

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
    await supabase.from('job_artifacts').insert({
        id: uuidv4(),
        job_id: jobId,
        revision: 1,
        task: task,
        json_data: data
    });
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
            status: 'failed',
            last_error: 'Servidor reiniciado durante o processamento'
        }).eq('status', 'processing');

        if (error) throw error;
    } catch (err) {
        console.error('[CLEANUP ERR]', err.message);
    }
});
