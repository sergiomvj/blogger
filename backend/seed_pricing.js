import { pool } from './services/db.js';

async function seedPricing() {
    try {
        console.log('🌱 Seeding Pricing Profiles...');

        const profiles = [
            {
                key: 'openai/gpt-4o',
                name: 'OpenAI GPT-4o',
                in: 2.50,
                out: 10.00,
                notes: 'GPT-4o standard pricing'
            },
            {
                key: 'openai/gpt-4o-mini',
                name: 'OpenAI GPT-4o Mini',
                in: 0.15,
                out: 0.60,
                notes: 'GPT-4o mini efficient pricing'
            },
            {
                key: 'anthropic/claude-3-5-sonnet',
                name: 'Claude 3.5 Sonnet',
                in: 3.00,
                out: 15.00,
                notes: 'Anthropic flagship model'
            },
            {
                key: 'google/gemini-2.0-flash-exp:free',
                name: 'Gemini 2.0 Flash (Free)',
                in: 0.00,
                out: 0.00,
                notes: 'Google free tier'
            },
            {
                key: 'meta-llama/llama-3.3-70b-instruct:free',
                name: 'Llama 3.3 70B (Free)',
                in: 0.00,
                out: 0.00,
                notes: 'Meta free tier via OpenRouter'
            }
        ];

        for (const p of profiles) {
            await pool.query(
                `INSERT INTO pricing_profiles (profile_key, display_name, input_per_1m_tokens, output_per_1m_tokens, notes) 
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), input_per_1m_tokens=VALUES(input_per_1m_tokens), output_per_1m_tokens=VALUES(output_per_1m_tokens)`,
                [p.key, p.name, p.in, p.out, p.notes]
            );
        }

        console.log('✅ Pricing Profiles seeded.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seedPricing();
