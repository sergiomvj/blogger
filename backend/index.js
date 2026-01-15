import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { pool } from './services/db.js';
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

app.get('/api/batches/active', dbCheck, async (req, res) => {
    try {
        const [batches] = await pool.query('SELECT * FROM batches ORDER BY created_at DESC LIMIT 1');
        if (batches.length === 0) return res.json(null);

        const batch = batches[0];
        const [costRows] = await pool.query(`
            SELECT SUM(
                (u.input_tokens / 1000000) * IFNULL(p.input_per_1m_tokens, 0) +
                (u.output_tokens / 1000000) * IFNULL(p.output_per_1m_tokens, 0)
            ) as current_cost
            FROM jobs j
            JOIN llm_usage_events u ON j.id = u.job_id
            LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key
            WHERE j.batch_id = ?
        `, [batch.id]);

        res.json({
            ...batch,
            current_cost: costRows[0].current_cost || 0
        });
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

app.post('/api/batches/:id/budget', dbCheck, async (req, res) => {
    const { id } = req.params;
    const { budget_limit } = req.body;
    try {
        await pool.query('UPDATE batches SET budget_limit = ? WHERE id = ?', [budget_limit, id]);
        res.json({ message: 'Budget limit updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/batches/:id/backup', dbCheck, async (req, res) => {
    const { id } = req.params;
    try {
        const [jobs] = await pool.query('SELECT * FROM jobs WHERE batch_id = ?', [id]);
        const zip = new AdmZip();

        for (const job of jobs) {
            const [artifacts] = await pool.query('SELECT * FROM job_artifacts WHERE job_id = ?', [job.id]);
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

app.get('/api/jobs/:id/cost-estimates', dbCheck, async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Get total tokens for this job
        const [usage] = await pool.query(
            'SELECT SUM(input_tokens) as input, SUM(output_tokens) as output FROM llm_usage_events WHERE job_id = ?',
            [id]
        );

        if (!usage[0] || usage[0].input === null) {
            return res.json({ estimates: [] });
        }

        const tokens = { input: usage[0].input || 0, output: usage[0].output || 0 };

        // 2. Get all active pricing profiles
        const [profiles] = await pool.query('SELECT * FROM pricing_profiles WHERE is_active = 1');

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
        await pool.query('DELETE FROM blog_styles WHERE id = ?', [req.params.id]);
        res.json({ message: 'Style deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/article-styles', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM article_styles ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// --- Prompts Library ---
app.get('/api/prompts/default', (req, res) => {
    res.json(TASK_PROMPTS);
});

// --- Media Support ---
app.use('/media', express.static(path.join(__dirname, 'media')));

app.get('/api/media', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT m.*, j.theme_pt FROM media_assets m LEFT JOIN jobs j ON m.job_id = j.id ORDER BY m.created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/prompts', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM custom_prompts');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/prompts', dbCheck, async (req, res) => {
    const { task_key, prompt_text } = req.body;
    if (!task_key || !prompt_text) return res.status(400).json({ error: 'Missing task_key or prompt_text' });
    try {
        await pool.query(
            'INSERT INTO custom_prompts (task_key, prompt_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE prompt_text = VALUES(prompt_text)',
            [task_key, prompt_text]
        );
        res.json({ message: 'Prompt saved' });
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

// --- Stats Endpoints ---
app.get('/api/stats/summary', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                COUNT(DISTINCT j.id) as total_articles,
                SUM(u.input_tokens) as total_input_tokens,
                SUM(u.output_tokens) as total_output_tokens,
                SUM(
                    (u.input_tokens / 1000000) * IFNULL(p.input_per_1m_tokens, 0) +
                    (u.output_tokens / 1000000) * IFNULL(p.output_per_1m_tokens, 0)
                ) as total_cost_usd
            FROM jobs j
            LEFT JOIN llm_usage_events u ON j.id = u.job_id
            LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key
        `);
        res.json(rows[0] || { total_articles: 0, total_input_tokens: 0, total_output_tokens: 0, total_cost_usd: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/history', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                DATE_FORMAT(u.created_at, '%b %d') as date,
                CAST(SUM(
                    (u.input_tokens / 1000000) * IFNULL(p.input_per_1m_tokens, 0) +
                    (u.output_tokens / 1000000) * IFNULL(p.output_per_1m_tokens, 0)
                ) AS DECIMAL(10,4)) as llm,
                0 as images
            FROM llm_usage_events u
            LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key
            WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(u.created_at), date
            ORDER BY DATE(u.created_at) ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats/details', dbCheck, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.model_id as label,
                p.display_name as provider,
                SUM(
                    (u.input_tokens / 1000000) * IFNULL(p.input_per_1m_tokens, 0) +
                    (u.output_tokens / 1000000) * IFNULL(p.output_per_1m_tokens, 0)
                ) as cost,
                SUM(u.input_tokens + u.output_tokens) as unit_count,
                'Tokens' as unit_label
            FROM llm_usage_events u
            JOIN pricing_profiles p ON u.model_id = p.profile_key
            GROUP BY u.model_id, p.display_name
            ORDER BY cost DESC
        `);
        res.json(rows);
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
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE batch_id = ?', [batchId]);
    for (const job of jobs) {
        jobQueue.push(job);
    }
    processNextInQueue();
}

async function checkBatchBudget(batchId) {
    const [batchRows] = await pool.query('SELECT budget_limit FROM batches WHERE id = ?', [batchId]);
    const limit = batchRows[0]?.budget_limit;
    if (limit === null || limit === undefined) return true;

    const [costRows] = await pool.query(`
        SELECT SUM(
            (u.input_tokens / 1000000) * IFNULL(p.input_per_1m_tokens, 0) +
            (u.output_tokens / 1000000) * IFNULL(p.output_per_1m_tokens, 0)
        ) as current_cost
        FROM jobs j
        JOIN llm_usage_events u ON j.id = u.job_id
        LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key
        WHERE j.batch_id = ?
    `, [batchId]);

    const currentCost = costRows[0].current_cost || 0;
    return currentCost < parseFloat(limit);
}

async function processNextInQueue() {
    if (activeJobs >= 3 || jobQueue.length === 0) return;

    const job = jobQueue[0]; // Espia o próximo
    const isWithinBudget = await checkBatchBudget(job.batch_id);

    if (!isWithinBudget) {
        console.log(`[BUDGET] Limite de gastos atingido para o batch ${job.batch_id}. Pausando jobs deste batch.`);
        // Remove todos os jobs deste batch da fila ativa (opcional, ou apenas pula)
        // Por simplicidade, vamos apenas retornar e parar o processamento da fila por agora
        // No mundo real, deveríamos marcar o batch como 'paused' ou similar.
        await pool.query('UPDATE batches SET status = \'budget_exceeded\' WHERE id = ?', [job.batch_id]);
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
    const [blogData] = await pool.query(
        `SELECT b.*, s.tone_of_voice, s.target_audience, s.editorial_guidelines, s.cta_config, s.forbidden_terms, s.description as style_desc
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
        `Tom: ${blogData[0].tone_of_voice}\nPúblico: ${blogData[0].target_audience}\nDiretrizes: ${JSON.stringify(blogData[0].editorial_guidelines)}\nCTAs: ${JSON.stringify(blogData[0].cta_config)}` :
        "Estilo padrão: Neutro e informativo.";

    const articleStyle = artStyleData[0] ?
        `Tipo: ${artStyleData[0].name}\nDescrição: ${artStyleData[0].description}\nEstrutura Desejada: ${JSON.stringify(artStyleData[0].structure_blueprint)}` :
        "Formato padrão: Artigo técnico.";

    const blacklist = blogData[0]?.forbidden_terms ? (typeof blogData[0].forbidden_terms === 'string' ? JSON.parse(blogData[0].forbidden_terms) : blogData[0].forbidden_terms) : [];

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

        // T13: Internal Links
        await update('T13', 72);
        try {
            const posts = await getWPPosts(blogData[0]);
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
        const result = await publishToWP(jobId, job, artifacts, blogData[0]);

        await pool.query('UPDATE jobs SET status = \'published\', wp_post_id = ?, wp_post_url = ?, progress = 100 WHERE id = ?',
            [result.post_id, result.post_url, jobId]);

    } catch (error) {
        console.error(`Pipeline Error [${jobId}]:`, error);
        await pool.query('UPDATE jobs SET status = \'failed\', last_error = ? WHERE id = ?', [error.message, jobId]);
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
