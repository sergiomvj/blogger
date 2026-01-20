import express from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import logger from 'morgan';

dotenv.config();

const app = express();
const db = new Database('blog.db');

// --- Initialization ---
db.exec(`
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT DEFAULT 'author'
    );

    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        name TEXT,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        name TEXT
    );

    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        external_id TEXT,
        external_source TEXT,
        idempotency_key TEXT UNIQUE,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        content TEXT,
        status TEXT DEFAULT 'draft',
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS post_categories (
        post_id TEXT,
        category_id TEXT,
        PRIMARY KEY (post_id, category_id)
    );
`);

// Seed default config if empty
const hmacSecret = process.env.HMAC_SECRET || crypto.randomBytes(32).toString('hex');
const existingSecret = db.prepare('SELECT value FROM config WHERE key = ?').get('hmac_secret');
if (!existingSecret) {
    db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('hmac_secret', hmacSecret);

    // Seed Default Super User: lionguava
    const superPass = crypto.randomBytes(12).toString('base64').substring(0, 16);
    const hash = crypto.createHash('sha256').update(superPass).digest('hex');
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), 'lionguava', hash, 'superadmin');

    console.log('--- NEW INSTALLATION ---');
    console.log('HMAC_SECRET generated:', hmacSecret);
    console.log('Default SuperUser: lionguava');
    console.log('Generated Password:', superPass);
    console.log('------------------------');
} else {
    console.log('HMAC_SECRET loaded from DB');
}

// --- Middleware ---
app.use(cors());
app.use(logger('dev'));
app.use(express.json());

const authenticate = (req, res, next) => {
    const signature = req.headers['x-aw-signature'];
    const timestamp = req.headers['x-aw-timestamp'];
    const secret = db.prepare('SELECT value FROM config WHERE key = ?').get('hmac_secret').value;

    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Auth headers missing' });
    }

    const bodyString = JSON.stringify(req.body);
    const expectedHmac = crypto.createHmac('sha256', secret)
        .update(timestamp + bodyString)
        .digest('hex');

    if (signature !== expectedHmac) {
        return res.status(403).json({ error: 'Invalid HMAC signature' });
    }

    next();
};

// --- CRUD API (Engine Compatible) ---

// Health Check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Create Post (Engine Entry Point)
app.post('/api/v1/posts', authenticate, async (req, res) => {
    const { title, slug, content, status, idempotency_key, external_id, external_source } = req.body.post || req.body;

    try {
        const id = uuidv4();
        const finalSlug = slug || title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        db.prepare(`
            INSERT INTO posts (id, external_id, external_source, idempotency_key, title, slug, content, status, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, external_id, external_source, idempotency_key, title, finalSlug, content, status || 'draft', status === 'published' ? new Date().toISOString() : null);

        res.status(201).json({
            id,
            status,
            slug: finalSlug,
            url: `http://localhost:4000/blog/${finalSlug}`,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error(err);
        if (err.message.includes('UNIQUE constraint failed: posts.idempotency_key')) {
            const existing = db.prepare('SELECT * FROM posts WHERE idempotency_key = ?').get(idempotency_key);
            return res.status(200).json(existing); // Return existing instead of conflict if idempotent
        }
        res.status(500).json({ error: err.message });
    }
});

// List Posts
app.get('/api/v1/posts', (req, res) => {
    const rows = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    res.json(rows);
});

// Update Post
app.put('/api/v1/posts/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { title, content, status } = req.body;
    db.prepare('UPDATE posts SET title = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, content, status, id);
    res.json({ message: 'Post updated' });
});

// Delete Post
app.delete('/api/v1/posts/:id', authenticate, (req, res) => {
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Post deleted' });
});

// --- User Management ---
app.get('/api/v1/users', authenticate, (req, res) => {
    const rows = db.prepare('SELECT id, username, role FROM users').all();
    res.json(rows);
});

app.post('/api/v1/users', authenticate, (req, res) => {
    const { username, password, role } = req.body;
    const id = uuidv4();
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, username, hash, role || 'author');
    res.status(201).json({ id, username, role });
});

app.delete('/api/v1/users/:id', authenticate, (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
});

// Categories
app.get('/api/v1/categories', (req, res) => {
    const rows = db.prepare('SELECT * FROM categories').all();
    res.json(rows);
});

app.post('/api/v1/categories', authenticate, (req, res) => {
    const { name, slug } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
    res.status(201).json({ id, name, slug });
});

// --- Simple Frontend Simulation ---
app.get('/', (req, res) => {
    const posts = db.prepare("SELECT * FROM posts WHERE status = 'published'").all();
    let html = `
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f4f7f6;">
            <h1>SmartBlog Client Demo</h1>
            <p style="color: #666;">This is a minimal blog instance connected to the Hub.</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0;">
            ${posts.length === 0 ? '<p>No posts published yet. Use the Dashboard to send some!</p>' : ''}
            ${posts.map(p => `
                <article style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="margin-top: 0;">${p.title}</h2>
                    <div style="font-size: 0.9em; color: #888; margin-bottom: 15px;">Published at: ${p.published_at}</div>
                    <div style="line-height: 1.6;">${p.content.substring(0, 300)}...</div>
                    <a href="/blog/${p.slug}" style="display: inline-block; margin-top: 15px; color: #2563eb; text-decoration: none; font-weight: bold;">Read More &rarr;</a>
                </article>
            `).join('')}
        </body>
    `;
    res.send(html);
});

app.get('/blog/:slug', (req, res) => {
    const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
    if (!post) return res.status(404).send('Post not found');
    res.send(`
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #fff;">
            <a href="/" style="color: #666; text-decoration: none;">&larr; Back to Home</a>
            <h1 style="font-size: 3em; margin-bottom: 10px;">${post.title}</h1>
            <hr>
            <div style="line-height: 1.8; font-size: 1.1em; color: #333;">${post.content}</div>
        </body>
    `);
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`\n🚀 SmartBlog Client Template is live!`);
    console.log(`📡 API: http://localhost:${PORT}/api/v1`);
    console.log(`🌐 Web: http://localhost:${PORT}`);
    console.log(`🔑 Initial HMAC Secret: ${db.prepare('SELECT value FROM config WHERE key = ?').get('hmac_secret').value}\n`);
});
