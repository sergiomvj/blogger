import axios from 'axios';
import { pool } from './db.js';

export async function generateImage(prompt, type = 'featured', jobId) {
    try {
        const [settingsRows] = await pool.query('SELECT openai_api_key, stability_api_key, image_mode FROM settings WHERE id = 1');
        const settings = settingsRows[0] || {};

        if (settings.image_mode === 'stability') {
            return await generateStabilityImage(prompt, settings.stability_api_key);
        } else {
            return await generateDalleImage(prompt, settings.openai_api_key);
        }
    } catch (error) {
        console.error(`Image Generation Error (${type}):`, error.message);
        return null; // Fallback to no image instead of failing the whole job
    }
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
        timeout: 60000
    });

    return response.data.data[0].url;
}

async function generateStabilityImage(prompt, apiKey) {
    if (!apiKey) throw new Error('Stability API Key not configured');

    // Stability implementation would go here... for now fallback to placeholder or error
    // (User might want to implement this later or use DALL-E as default)
    throw new Error('Stability AI implementation pending. Please use DALL-E 3 for now.');
}
