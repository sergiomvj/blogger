export interface LlmRequest {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    model?: string;
    jsonMode?: boolean;
}

export interface LlmResponse {
    content: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
    latencyMs: number;
}

export interface ILlmProvider {
    generate(request: LlmRequest): Promise<LlmResponse>;
    id: string;
}
