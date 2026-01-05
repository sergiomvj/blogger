import { pool } from './services/db.js';

async function checkErrors() {
    try {
        const [rows] = await pool.query('SELECT id, theme_pt, status, current_step, last_error FROM jobs ORDER BY created_at DESC LIMIT 10');
        console.log('\n--- ÚLTIMOS 10 JOBS ---');
        rows.forEach(row => {
            console.log(`ID: ${row.id.substring(0, 8)} | Tema: ${row.theme_pt.substring(0, 30)}... | Status: ${row.status} | Passo: ${row.current_step}`);
            if (row.last_error) {
                console.log(` ERROR: ${row.last_error}`);
            }
            console.log('-----------------------');
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkErrors();
