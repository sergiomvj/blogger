import { ILlmProvider, LlmRequest, LlmResponse } from '../types';

export abstract class BaseLlmProvider implements ILlmProvider {
    constructor(public readonly id: string, protected apiKey: string) { }

    abstract generate(request: LlmRequest): Promise<LlmResponse>;
}
