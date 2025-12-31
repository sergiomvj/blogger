import { pool } from './db';

async function reset() {
    try {
        await pool.query(`
            UPDATE jobs 
            SET status = 'queued', current_step = 'T0', last_error = NULL, attempts = 0
            WHERE status = 'failed'
        `);
        console.log('Jobs reset to queued');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

reset();
