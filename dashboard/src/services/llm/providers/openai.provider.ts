import { BaseLlmProvider } from './base.provider';
import { LlmRequest, LlmResponse } from '../types';
import axios from 'axios';

export class OpenAiProvider extends BaseLlmProvider {
    constructor(apiKey: string) {
        super('openai', apiKey);
    }

    async generate(request: LlmRequest): Promise<LlmResponse> {
        const start = Date.now();
        const model = request.model || 'gpt-4o'; // Default to GPT-4o

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: request.systemPrompt },
                        { role: 'user', content: request.userPrompt },
                    ],
                    temperature: request.temperature ?? 0.7,
                    response_format: request.jsonMode ? { type: 'json_object' } : undefined,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = response.data;
            const latency = Date.now() - start;

            return {
                content: data.choices[0].message.content,
                inputTokens: data.usage.prompt_tokens,
                outputTokens: data.usage.completion_tokens,
                model: data.model,
                latencyMs: latency,
            };
        } catch (error: any) {
            console.error('OpenAI API Error:', error.response?.data || error.message);
            throw new Error(`OpenAI generation failed: ${error.message}`);
        }
    }
}
