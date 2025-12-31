import { pool } from './db';

const jobId = 'a5e237fa-2b7a-486a-b61c-5a79b75dcd39';

async function check() {
    try {
        const res = await pool.query('SELECT current_step, status, last_error FROM jobs WHERE id = $1', [jobId]);
        console.log(JSON.stringify(res.rows[0], null, 2));

        const artifacts = await pool.query('SELECT task, json_data FROM job_artifacts WHERE job_id = $1', [jobId]);
        console.log('Artifacts Count:', artifacts.rows.length);
        if (artifacts.rows.length > 0) {
            console.log('Last Artifact Task:', artifacts.rows[0].task);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
