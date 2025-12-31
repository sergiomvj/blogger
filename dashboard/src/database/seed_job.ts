import { pool } from './db';

async function seed() {
    try {
        const batchRes = await pool.query(`
            INSERT INTO batches (name, source_csv_filename, status)
            VALUES ('Seed Batch', 'test.csv', 'processing')
            RETURNING id
        `);
        const batchId = batchRes.rows[0].id;
        console.log('Batch created:', batchId);

        const jobRes = await pool.query(`
            INSERT INTO jobs (
                batch_id, 
                job_key, 
                idempotency_key, 
                blog_key, 
                blog_id, 
                category, 
                objective_pt, 
                theme_pt, 
                language_target, 
                word_count, 
                status, 
                current_step
            )
            VALUES (
                $1,
                'key-1',
                'idem-1',
                'blog-test',
                1,
                'Technology',
                'Explicar como funciona o Docker para iniciantes',
                'Docker Tutorial',
                'en',
                1000,
                'queued',
                'T0'
            )
            RETURNING id;
        `, [batchId]);

        console.log('Job created:', jobRes.rows[0].id);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

seed();
