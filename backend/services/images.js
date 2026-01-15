import axios from 'axios';
import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mediaDir = path.join(__dirname, '../media');

if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}

export async function generateImage(prompt, type = 'featured', jobId) {
    try {
        const [settingsRows] = await pool.query('SELECT openai_api_key, stability_api_key, image_mode FROM settings WHERE id = 1');
        const settings = settingsRows[0] || {};

        let remoteUrl = null;
        if (settings.image_mode === 'stability') {
            remoteUrl = await generateStabilityImage(prompt, settings.stability_api_key);
        } else {
            remoteUrl = await generateDalleImage(prompt, settings.openai_api_key);
        }

        if (!remoteUrl) return null;

        // Download locally
        const filename = `${uuidv4()}.png`;
        const localPath = path.join(mediaDir, filename);
        await downloadImage(remoteUrl, localPath);

        const localUrl = `/media/${filename}`;

        // Save to DB
        await pool.query(
            'INSERT INTO media_assets (id, job_id, type, url, remote_url) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), jobId, type, localUrl, remoteUrl]
        );

        return localUrl;
    } catch (error) {
        console.error(`Image Generation Error (${type}):`, error.message);
        return null;
    }
}

async function downloadImage(url, dest) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function generateDalleImage(prompt, apiKey) {
    if (!apiKey) throw new Error('OpenAI API Key not configured for DALL-E');

    const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 90000
    });

    return response.data.data[0].url;
}

async function generateStabilityImage(prompt, apiKey) {
    if (!apiKey) throw new Error('Stability API Key not configured');
    throw new Error('Stability AI implementation pending. Please use DALL-E 3 for now.');
}
