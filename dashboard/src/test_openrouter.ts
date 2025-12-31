import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testOpenRouter() {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
        console.error('No OPENROUTER_API_KEY found in .env');
        return;
    }
    console.log('Key found (length):', key.length);

    const models = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemini-2.0-flash-exp:free'
    ];

    for (const model of models) {
        console.log(`Testing model: ${model}...`);
        try {
            const res = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: model,
                    messages: [{ role: 'user', content: 'Say hello' }]
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
        console.log('---');
    }
}

testOpenRouter();
