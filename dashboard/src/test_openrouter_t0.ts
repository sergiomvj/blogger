import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testOpenRouterT0() {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return;

    const model = 'meta-llama/llama-3.3-70b-instruct:free';

    console.log(`Testing T0 simulation with ${model}...`);

    const systemPrompt = `Você é um assistente editorial profissional.

Regras inegociáveis:
- Responda exclusivamente em JSON
- Não inclua markdown, explicações ou texto fora do JSON
- O JSON deve validar exatamente com: { "brief": "string", "audience": "string", "search_intent": "string" }
- Idioma de saída: pt

Se não tiver certeza, faça a melhor inferência possível sem violar o schema.`;

    const userPrompt = `Task: semantic_brief
Idioma final: pt

Objetivo (PT): Explicar como funciona o Docker para iniciantes
Tema central (PT): Docker Tutorial
Categoria: Technology
Tamanho desejado: 1000 palavras

Crie um brief semântico no idioma final contendo:
- resumo editorial claro (brief)
- público-alvo presumido (audience)
- intenção de busca principal (search_intent)`;

    try {
        const res = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'Test Script'
                }
            }
        );
        console.log(`Success! Status: ${res.status}`);
        console.log('Response:', res.data.choices[0].message.content);
    } catch (e: any) {
        console.error(`Failed: ${e.message}`);
        if (e.response) {
            console.error('Data:', JSON.stringify(e.response.data));
        }
    }
}

testOpenRouterT0();
