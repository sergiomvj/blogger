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

// --- Database Readiness Check ---
app.use(async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        next();
    } catch (err) {
        console.error('⚠️ Requisição bloqueada: Banco de dados inacessível.');
        res.status(503).json({ error: 'Database Unavailable', details: err.message });
    }
});

// --- Logger ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Health Check ---
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// --- API Endpoints ---

app.get('/api/batches', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM batches ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/jobs', async (req, res) => {
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

app.post('/api/upload', upload.single('csv'), async (req, res) => {
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
            await pool.query(
                `INSERT INTO jobs (id, batch_id, job_key, idempotency_key, blog_key, blog_id, theme_pt, language_target, word_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), batchId, record.post_title, uuidv4(), 'default', record.blog_id || 1, record.post_title, 'pt', parseInt(record.target_word_count) || 1000]
            );
        }

        processBatchBackground(batchId);
        res.json({ message: 'Batch queued', batch_id: batchId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Pipeline Runner ---

async function processBatchBackground(batchId) {
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE batch_id = ?', [batchId]);
    for (const job of jobs) {
        runJobPipeline(job);
    }
}

async function runJobPipeline(job) {
    const jobId = job.id;
    const artifacts = {};
    const context = { ...job, language: job.language_target };

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
        await update('T6', 80);
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

        // Final Step: Publication
        await update('T10', 95);
        const result = await publishToWP(jobId, job, artifacts);

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

// --- Serve Frontend Assets ---
// Servir arquivos estáticos da pasta dist (gerada pelo build do Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// Rota para qualquer outra coisa (SPA Routing)
// Se não for uma rota de API, entrega o index.html do React
app.get('*', (req, res) => {
    // Evita loop infinito se a pasta dist não existir
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found. Please run npm run build.');
    }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('❌ Erro Fatal no Servidor:', err);
    res.status(500).json({
        error: 'Erro Interno',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend is loud and clear on port ${PORT}`);
    console.log(`DASHBOARD: ${path.join(__dirname, 'dist')}`);
});
