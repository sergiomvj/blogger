import axios from 'axios';
import dotenv from 'dotenv';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { SYSTEM_PROMPT, TASK_PROMPTS } from './prompts.js';
import { ROUTER_CONFIG } from './router.js';
import { SCHEMAS } from './schemas.js';
import { supabase } from './db.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export async function callLLM(task, jobId, context) {
    const language = context.language || 'pt';
    let models = ROUTER_CONFIG.models[task];

    // 1. Fetch settings (Keys and Strategy)
    let settingsData = {
        use_llm_strategy: 1,
        provider_openai_enabled: 1,
        provider_anthropic_enabled: 1,
        provider_google_enabled: 1,
        openai_api_key: null,
        openrouter_api_key: process.env.OPENROUTER_API_KEY
    };

    try {
        const { data: settings, error } = await supabase.from('settings').select('*').eq('id', 1).single();
        if (settings) settingsData = { ...settingsData, ...settings };
    } catch (err) {
        console.warn('[LLM] Failed to fetch settings:', err.message);
    }

    // 2. Filter models based on enabled providers
    models = (models || []).filter(m => {
        if (m.model.startsWith('openai/') && !settingsData.provider_openai_enabled) return false;
        if (m.model.startsWith('anthropic/') && !settingsData.provider_anthropic_enabled) return false;
        if (m.model.startsWith('google/') && !settingsData.provider_google_enabled) return false;
        return true;
    });

    if (!models || models.length === 0) {
        throw new Error(`No enabled models configured for task: ${task}`);
    }

    // 3. Apply fallback strategy logic
    if (!settingsData.use_llm_strategy) {
        models = [models[0]]; // Only use primary
    }

    // 4. Fetch Custom Prompt Override
    let customPrompt = null;
    try {
        const { data: pData } = await supabase.from('custom_prompts').select('prompt_text').eq('task_key', task).single();
        if (pData) customPrompt = pData.prompt_text;
    } catch (err) {
        console.warn('[LLM] Custom prompt fetch failed:', err.message);
    }

    let lastError = null;

    for (const modelConfig of models) {
        try {
            console.log(`[LLM] Calling ${modelConfig.model} for task ${task}...`);
            const startTime = Date.now();
            let result = await attemptGeneration(task, modelConfig, context, language, settingsData, customPrompt);
            let latency = Date.now() - startTime;

            // 4. Wrap and Validate
            const schema = SCHEMAS[task];
            if (schema) {
                // We wrap the result to match our defined schemas (task, language, data)
                const wrappedData = {
                    task: task,
                    language: language,
                    prompt_version: "1.0.0",
                    data: result.data.data || result.data // Handle both cases
                };

                const validate = ajv.compile(schema);
                const valid = validate(wrappedData);

                if (!valid) {
                    console.warn(`[LLM REPAIR] Validation failed for ${task}. Errors:`, JSON.stringify(validate.errors, null, 2));

                    const repairStartTime = Date.now();
                    try {
                        let repairResult = await attemptRepair(task, schema, JSON.stringify(result.data), modelConfig, context, language, settingsData);
                        await logLLMUsage(jobId, task, modelConfig, repairResult.usage, Date.now() - repairStartTime, true, { event_type: 'repair' });
                        return repairResult.data.data || repairResult.data;
                    } catch (repairErr) {
                        console.error(`[LLM REPAIR] Repair failed:`, repairErr.message);
                        throw new Error(`Repair failed: ${repairErr.message}`);
                    }
                }

                // If valid, return the data part
                await logLLMUsage(jobId, task, modelConfig, result.usage, latency, true, { event_type: 'primary' });
                return wrappedData.data;
            }

            // No schema, return as is
            await logLLMUsage(jobId, task, modelConfig, result.usage, latency, true, { event_type: 'primary' });
            return result.data.data || result.data;

        } catch (error) {
            lastError = error;
            const errorData = error.response?.data || error.message;
            console.error(`[LLM ERROR] ${modelConfig.model} failed:`, JSON.stringify(errorData));
            await logLLMUsage(jobId, task, modelConfig, null, 0, false, { error: error.message, details: errorData });
            continue; // Next model
        }
    }

    throw new Error(`All models failed for task ${task}. Last error: ${lastError.message}`);
}

async function attemptGeneration(task, config, context, language, settings, customPrompt = null) {
    let systemPrompt = settings.base_prompt || SYSTEM_PROMPT;
    const openai_api_key = settings.openai_api_key;
    const openrouter_api_key = settings.openrouter_api_key || process.env.OPENROUTER_API_KEY;

    // Template replacement
    systemPrompt = systemPrompt.replace(/\{language\}/g, language);
    let userPrompt = customPrompt || TASK_PROMPTS[task] || "";

    for (const [key, value] of Object.entries(context)) {
        const val = typeof value === 'object' ? JSON.stringify(value) : value;
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        systemPrompt = systemPrompt.replace(regex, val);
        userPrompt = userPrompt.replace(regex, val);
    }

    let url, headers, payload;

    if (config.model.startsWith('openai/') && openai_api_key) {
        url = 'https://api.openai.com/v1/chat/completions';
        headers = { 'Authorization': `Bearer ${openai_api_key}`, 'Content-Type': 'application/json' };
        payload = {
            model: config.model.replace('openai/', ''),
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
        };
    } else {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${openrouter_api_key}`,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'AutoWriter Multisite',
            'Content-Type': 'application/json'
        };
        payload = {
            model: config.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' }
        };
    }

    const response = await axios.post(url, payload, { headers, timeout: 90000 });

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid API response structure');
    }

    const raw = response.data.choices[0].message.content;
    const content = JSON.parse(raw);
    const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
        data: content,
        raw: raw,
        usage: { input: usage.prompt_tokens, output: usage.completion_tokens }
    };
}

async function attemptRepair(task, schema, rawOutput, config, context, language, settings) {
    const openai_api_key = settings.openai_api_key;
    const openrouter_api_key = settings.openrouter_api_key || process.env.OPENROUTER_API_KEY;

    const repairSystemPrompt = `Você é um especialista em correção de JSON.
Regras:
1. Analise o schema JSON e o output inválido fornecidos.
2. Sua resposta deve ser exclusivamente o JSON corrigido que valide contra o schema.
3. Não inclua nenhuma explicação, comentário ou blocos de código (markdown).
4. Preserve a totalidade das informações originais, apenas corrija a estrutura.`;

    const repairUserPrompt = `TASK: ${task}\nSCHEMA:\n${JSON.stringify(schema, null, 2)}\n\nINVALID_OUTPUT:\n${rawOutput}\n\nRetorne apenas o JSON puro.`;

    let url, headers, payload;

    if (config.model.startsWith('openai/') && openai_api_key) {
        url = 'https://api.openai.com/v1/chat/completions';
        headers = { 'Authorization': `Bearer ${openai_api_key}`, 'Content-Type': 'application/json' };
        payload = {
            model: config.model.replace('openai/', ''),
            messages: [
                { role: 'system', content: repairSystemPrompt },
                { role: 'user', content: repairUserPrompt }
            ],
            response_format: { type: 'json_object' }
        };
    } else {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${openrouter_api_key}`,
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'Content-Type': 'application/json'
        };
        payload = {
            model: config.model,
            messages: [
                { role: 'system', content: repairSystemPrompt },
                { role: 'user', content: repairUserPrompt }
            ],
            response_format: { type: 'json_object' }
        };
    }

    const response = await axios.post(url, payload, { headers, timeout: 60000 });
    const content = JSON.parse(response.data.choices[0].message.content);
    const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0 };

    return {
        data: content,
        usage: { input: usage.prompt_tokens, output: usage.completion_tokens }
    };
}

async function logLLMUsage(jobId, task, config, usage, latency, success, meta = {}) {
    try {
        await supabase.from('llm_usage_events').insert({
            id: uuidv4(),
            job_id: jobId,
            revision: 1,
            task: task,
            provider_key: config.provider,
            model_id: config.model,
            prompt_version: '1.0.0',
            input_tokens: usage?.input || 0,
            output_tokens: usage?.output || 0,
            latency_ms: latency,
            success: success,
            event_type: meta.event_type || 'primary',
            raw_meta: meta
        });
    } catch (err) {
        // console.warn('[LLM] Logging failure:', err.message);
    }
}
