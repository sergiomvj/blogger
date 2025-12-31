import { ILlmProvider } from './types';

export class RepairService {
    constructor(private provider: ILlmProvider) { }

    /**
     * Tenta corrigir um JSON inválido usando LLM.
     */
    async repairJson<T>(
        invalidJson: string,
        schemaJson: string,
        errorContext?: string
    ): Promise<T> {
        const systemPrompt = `
Você é um corretor de JSON.
Regras:
- Você receberá um SCHEMA JSON e um OUTPUT inválido (ou erro de parse).
- Sua resposta deve ser SOMENTE um JSON válido que passe no schema.
- Não adicione texto fora do JSON.
- Se existir texto fora do JSON na entrada, remova.
- Se houver campos faltando, preencha com inferência mínima e segura ("").
- Se houver aspas erradas, corrija para aspas duplas ASCII.
`.trim();

        const userPrompt = `
SCHEMA:
${schemaJson}

INVALID_OUTPUT:
${invalidJson}

ERROR_CONTEXT:
${errorContext || 'JSON Parse Error'}

Return ONLY the fixed JSON.
`.trim();

        console.log('[RepairService] Tentando corrigir JSON...');

        const response = await this.provider.generate({
            systemPrompt,
            userPrompt,
            temperature: 0, // Determinístico para correções
            jsonMode: true,
            model: 'gpt-4o', // Usar o modelo mais forte para repair
        });

        try {
            const fixed = JSON.parse(response.content);
            return fixed as T;
        } catch (e) {
            throw new Error('RepairService falhou: O modelo retornou um JSON ainda inválido.');
        }
    }
}
