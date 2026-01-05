import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { pool } from './services/db.js';
import { callLLM } from './services/llm.js';
import { publishToWP } from './services/wordpress.js';
import path from 'path';
import { fileURLToPath } from 'url';

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

// --- Database Readiness Check (Somente para API) ---
const dbCheck = async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        next();
    } catch (err) {
        console.error('❌ Erro de Banco na API:', err.message);
        res.status(503).json({ error: 'Database Unavailable', details: err.message });
    }
};

// --- API Endpoints ---
app.get('/api/batches', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM batches ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jobs', dbCheck, async (req, res) => {
    try {
        const { batch_id } = req.query;
        const [rows] = batch_id
            ? await pool.query('SELECT * FROM jobs WHERE batch_id = ? ORDER BY created_at DESC', [batch_id])
            : await pool.query('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/blogs', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blogs WHERE is_active = 1');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blogs', dbCheck, async (req, res) => {
    const { blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, application_password } = req.body;
    try {
        const id = uuidv4();
        const auth = { type: 'application_password', password: application_password };
        await pool.query(
            'INSERT INTO blogs (id, blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, auth_credentials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, blog_key, blog_id, site_url, api_url, hmac_secret, style_key || 'analitica', wp_user || 'admin', JSON.stringify(auth)]
        );
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
        await pool.query(
            'UPDATE blogs SET blog_key = ?, blog_id = ?, site_url = ?, api_url = ?, hmac_secret = ?, style_key = ?, wp_user = ?, auth_credentials = ? WHERE id = ?',
            [blog_key, blog_id, site_url, api_url, hmac_secret, style_key, wp_user, JSON.stringify(auth), id]
        );
        res.json({ message: 'Blog updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/blogs/:id', dbCheck, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM blogs WHERE id = ?', [id]);
        res.json({ message: 'Blog deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blogs/:id/sync', dbCheck, async (req, res) => {
    const { id } = req.params;
    try {
        const [blogs] = await pool.query('SELECT * FROM blogs WHERE id = ?', [id]);
        if (blogs.length === 0) return res.status(404).json({ error: 'Blog not found' });

        const blog = blogs[0];
        const auth = typeof blog.auth_credentials === 'string' ? JSON.parse(blog.auth_credentials) : blog.auth_credentials;
        const basicAuth = Buffer.from(`admin:${auth.password}`).toString('base64');

        const response = await axios.get(`${blog.api_url}/autowriter/v1/discovery`, {
            headers: { 'Authorization': `Basic ${basicAuth}` }
        });

        const discovery = response.data;
        // Search for the specific blog_id in the multisite response
        const siteData = discovery.sites.find(s => s.id == blog.blog_id) || discovery.sites[0];

        if (siteData) {
            await pool.query(
                'UPDATE blogs SET name = ?, categories_json = ?, authors_json = ?, last_discovery = NOW() WHERE id = ?',
                [siteData.name, JSON.stringify(siteData.categories), JSON.stringify(siteData.authors), id]
            );
        }

        res.json({ message: 'Sync complete', data: siteData });
    } catch (err) {
        console.error('Sync error:', err.response?.data || err.message);
        res.status(500).json({ error: err.message || 'Discovery failed' });
    }
});

// --- Settings Endpoints ---
app.get('/api/settings', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (rows.length === 0) {
            // Se não existe, cria com valores default
            await pool.query('INSERT INTO settings (id) VALUES (1)');
            return res.json({});
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', dbCheck, async (req, res) => {
    const {
        openai_api_key, openrouter_api_key, anthropic_api_key, stability_api_key, image_mode, base_prompt,
        use_llm_strategy, provider_openai_enabled, provider_anthropic_enabled, provider_google_enabled
    } = req.body;
    try {
        await pool.query(
            `INSERT INTO settings (
                id, openai_api_key, openrouter_api_key, anthropic_api_key, stability_api_key, 
                image_mode, base_prompt, use_llm_strategy, 
                provider_openai_enabled, provider_anthropic_enabled, provider_google_enabled
            ) 
             VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
                openai_api_key = VALUES(openai_api_key),
                openrouter_api_key = VALUES(openrouter_api_key),
                anthropic_api_key = VALUES(anthropic_api_key),
                stability_api_key = VALUES(stability_api_key),
                image_mode = VALUES(image_mode),
                base_prompt = VALUES(base_prompt),
                use_llm_strategy = VALUES(use_llm_strategy),
                provider_openai_enabled = VALUES(provider_openai_enabled),
                provider_anthropic_enabled = VALUES(provider_anthropic_enabled),
                provider_google_enabled = VALUES(provider_google_enabled)`,
            [
                openai_api_key, openrouter_api_key, anthropic_api_key, stability_api_key,
                image_mode, base_prompt, use_llm_strategy,
                provider_openai_enabled, provider_anthropic_enabled, provider_google_enabled
            ]
        );
        res.json({ message: 'Settings saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Job Endpoints ---
app.get('/api/jobs/:id', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jobs/:id/artifacts', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT task, json_data, created_at FROM job_artifacts WHERE job_id = ? ORDER BY created_at ASC', [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/jobs/:id', dbCheck, async (req, res) => {
    try {
        await pool.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
        res.json({ message: 'Job deleted' });
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
        await pool.query(
            'INSERT INTO batches (id, name, source_csv_filename, status) VALUES (?, ?, ?, ?)',
            [batchId, batchName, req.file.originalname, 'processing']
        );

        for (const record of records) {
            const metadata = {
                tags: record.tags || '',
                tone: record.tone || '',
                cta: record.cta || '',
                sources: record.sources || '',
                featured_image_url: record.featured_image_url || '',
                top_image_url: record.top_image_url || '',
                featured_image_alt: record.featured_image_alt || '',
                top_image_alt: record.top_image_alt || ''
            };

            const theme = record.theme || 'Untitled Theme';

            await pool.query(
                `INSERT INTO jobs (
                    id, batch_id, job_key, idempotency_key, 
                    blog_key, blog_id, category, article_style_key,
                    objective_pt, theme_pt, language_target, word_count, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    batchId,
                    theme.substring(0, 100),
                    uuidv4(),
                    record.blog || 'default',
                    parseInt(record.blog_id_override) || 1,
                    record.category || 'Geral',
                    record.article_style || record.style || 'analitica',
                    record.objective || '',
                    theme,
                    record.language || 'pt',
                    parseInt(record.word_count) || 1000,
                    JSON.stringify(metadata)
                ]
            );
        }

        processBatchBackground(batchId);
        res.json({ message: 'Batch queued', batch_id: batchId });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE batch_id = ?', [batchId]);
    for (const job of jobs) {
        jobQueue.push(job);
    }
    processNextInQueue();
}

async function processNextInQueue() {
    if (activeJobs >= 3 || jobQueue.length === 0) return;

    activeJobs++;
    const job = jobQueue.shift();

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
    const [blogData] = await pool.query(
        `SELECT b.*, s.tone_of_voice, s.target_audience, s.editorial_guidelines, s.description as style_desc
         FROM blogs b 
         LEFT JOIN blog_styles s ON b.style_key = s.style_key 
         WHERE b.blog_key = ?`,
        [job.blog_key]
    );

    const [artStyleData] = await pool.query(
        'SELECT * FROM article_styles WHERE style_key = ?',
        [job.article_style_key]
    );

    const blogStyle = blogData[0] ?
        `Tom: ${blogData[0].tone_of_voice}\nPúblico: ${blogData[0].target_audience}\nDiretrizes: ${JSON.stringify(blogData[0].editorial_guidelines)}` :
        "Estilo padrão: Neutro e informativo.";

    const articleStyle = artStyleData[0] ?
        `Tipo: ${artStyleData[0].name}\nDescrição: ${artStyleData[0].description}\nEstrutura Desejada: ${JSON.stringify(artStyleData[0].structure_blueprint)}` :
        "Formato padrão: Artigo técnico.";

    const context = {
        ...job,
        language: job.language_target,
        blog_style: blogStyle,
        article_style: articleStyle
    };

    try {
        const update = (step, progress) => pool.query('UPDATE jobs SET current_step = ?, progress = ?, status = \'processing\' WHERE id = ?', [step, progress, jobId]);

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
        artifacts.quality_gate = await callLLM('quality_gate', jobId, { ...context, content_html: artifacts.article_body.content_html });
        await saveArtifact(jobId, 'quality_gate', artifacts.quality_gate);

        // Final Step: Publication
        await update('T12', 98);
        const result = await publishToWP(jobId, job, artifacts, blogData[0]);

        await pool.query('UPDATE jobs SET status = \'published\', wp_post_id = ?, wp_post_url = ?, progress = 100 WHERE id = ?',
            [result.post_id, result.post_url, jobId]);

    } catch (error) {
        console.error(`Pipeline Error [${jobId}]:`, error);
        await pool.query('UPDATE jobs SET status = \'failed\', last_error = ? WHERE id = ?', [error.message, jobId]);
    }
}

async function saveArtifact(jobId, task, data) {
    await pool.query('INSERT INTO job_artifacts (id, job_id, revision, task, json_data) VALUES (?, ?, ?, ?, ?)', [uuidv4(), jobId, 1, task, JSON.stringify(data)]);
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
        const [result] = await pool.query('UPDATE jobs SET status = \'failed\', last_error = \'Servidor reiniciado durante o processamento\' WHERE status = \'processing\'');
        if (result.affectedRows > 0) {
            console.log(`[CLEANUP] ${result.affectedRows} jobs resetados de 'processing' para 'failed'.`);
        }
    } catch (err) {
        console.error('[CLEANUP ERR]', err.message);
    }
});
