import axios from 'axios';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, TASK_PROMPTS } from './prompts.js';
import { ROUTER_CONFIG } from './router.js';
import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function callLLM(task, jobId, context) {
    const language = context.language || 'pt';
    let models = ROUTER_CONFIG.models[task];

    // Fetch settings to check strategy
    let settingsData = {
        use_llm_strategy: 1,
        provider_openai_enabled: 1,
        provider_anthropic_enabled: 1,
        provider_google_enabled: 1
    };
    try {
        const [rows] = await pool.query('SELECT use_llm_strategy, provider_openai_enabled, provider_anthropic_enabled, provider_google_enabled FROM settings WHERE id = 1');
        if (rows[0]) settingsData = rows[0];
    } catch (err) {
        console.warn('Failed to fetch strategy settings:', err.message);
    }

    // Filter models based on enabled providers
    models = models.filter(m => {
        if (m.model.startsWith('openai/') && !settingsData.provider_openai_enabled) return false;
        if (m.model.startsWith('anthropic/') && !settingsData.provider_anthropic_enabled) return false;
        if (m.model.startsWith('google/') && !settingsData.provider_google_enabled) return false;
        return true;
    });

    if (!models || models.length === 0) {
        throw new Error(`No enabled models configured for task: ${task}`);
    }

    // If strategy is OFF, only use the first one
    if (!settingsData.use_llm_strategy) {
        models = [models[0]];
    }

    let lastError = null;

    for (const modelConfig of models) {
        try {
            const startTime = Date.now();
            const result = await attemptGeneration(task, modelConfig, context, language);
            const latency = Date.now() - startTime;

            // Log success
            await logLLMUsage(jobId, task, modelConfig, result.usage, latency, true);

            return result.data;
        } catch (error) {
            lastError = error;
            // Log failure
            console.error(`[LLM DEBUG] Full error for ${modelConfig.model}:`, error.response?.data || error.message);
            await logLLMUsage(jobId, task, modelConfig, null, 0, false, error.response?.data ? JSON.stringify(error.response.data) : error.message);

            continue; // Fallback to next model
        }
    }

    throw new Error(`All models failed for task ${task}. Last error: ${lastError.message}`);
}

async function attemptGeneration(task, config, context, language) {
    // Fetch base prompt from settings
    let systemPrompt = SYSTEM_PROMPT;
    try {
        const [settings] = await pool.query('SELECT base_prompt FROM settings WHERE id = 1');
        if (settings[0]?.base_prompt) {
            systemPrompt = settings[0].base_prompt;
        }
    } catch (err) {
        console.warn('Failed to fetch custom system prompt, using default:', err.message);
    }

    systemPrompt = systemPrompt.replace('{language}', language);
    let userPrompt = TASK_PROMPTS[task];

    // Replace all placeholders from context in BOTH prompts
    for (const [key, value] of Object.entries(context)) {
        const placeholder = `{${key}}`;
        systemPrompt = systemPrompt.split(placeholder).join(value);
        userPrompt = userPrompt.split(placeholder).join(value);
    }

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: config.model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
    }, {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'AutoWriter Multisite',
            'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 minute timeout
    });

    if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error(`Invalid response from OpenRouter: ${JSON.stringify(response.data)}`);
    }

    const content = JSON.parse(response.data.choices[0].message.content);
    const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
        data: content,
        usage: {
            input: usage.prompt_tokens,
            output: usage.completion_tokens
        }
    };
}

async function logLLMUsage(jobId, task, config, usage, latency, success, rawMeta = null) {
    try {
        await pool.query(
            `INSERT INTO llm_usage_events (
        id, job_id, revision, task, provider_key, model_id, prompt_version,
        input_tokens, output_tokens, latency_ms, success, raw_meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuidv4(),
                jobId,
                1, // Revision
                task,
                config.provider,
                config.model,
                '1.0.0',
                usage?.input || 0,
                usage?.output || 0,
                latency,
                success,
                rawMeta ? JSON.stringify(rawMeta) : null
            ]
        );
    } catch (err) {
        console.error('Failed to log LLM usage:', err.message);
    }
}
