import { pool } from './services/db.js';

async function patch() {
    try {
        console.log('Adding LLM Strategy columns to settings table...');
        await pool.query(`
            ALTER TABLE settings 
            ADD COLUMN use_llm_strategy BOOLEAN DEFAULT TRUE,
            ADD COLUMN provider_openai_enabled BOOLEAN DEFAULT TRUE,
            ADD COLUMN provider_anthropic_enabled BOOLEAN DEFAULT TRUE,
            ADD COLUMN provider_google_enabled BOOLEAN DEFAULT TRUE
        `);
        console.log('Patch successful.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Columns already exist.');
            process.exit(0);
        }
        console.error('Patch failed:', err.message);
        process.exit(1);
    }
}

patch();
