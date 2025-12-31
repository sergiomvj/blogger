import { Request, Response } from 'express';
import { CsvService } from '../services/csv.service';
import fs from 'fs';
import { pool } from '../config/database';
import crypto from 'crypto';

export class UploadController {

    static async uploadCsv(req: Request, res: Response): Promise<void> {
        if (!req.file) {
            res.status(400).json({ error: 'Nenhum arquivo enviado' });
            return;
        }

        try {
            const filePath = req.file.path;
            const result = await CsvService.parseFile(filePath);

            // Clean up temp file
            fs.unlinkSync(filePath);

            if (result.valid.length === 0 && result.invalid.length > 0) {
                res.status(400).json({
                    message: 'CSV inválido em todas as linhas.',
                    details: result.invalid
                });
                return;
            }

            // Resolve Blog Mapping
            const blogMappingStr = process.env.BLOG_MAPPING || '{}';
            let blogMapping: Record<string, number>;
            try {
                blogMapping = JSON.parse(blogMappingStr);
            } catch (e) {
                console.error('Erro ao parsear BLOG_MAPPING:', e);
                res.status(500).json({ error: 'Erro de configuração do servidor (BLOG_MAPPING)' });
                return;
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // 1. Create Batch
                const batchName = `Batch ${new Date().toISOString()}`; // Can be improved
                const insertBatchQuery = `
          INSERT INTO batches (name, source_csv_filename, status)
          VALUES ($1, $2, 'created')
          RETURNING id
        `;
                const batchRes = await client.query(insertBatchQuery, [batchName, req.file.originalname]);
                const batchId = batchRes.rows[0].id;

                // 2. Create Jobs
                const jobsCreated = [];
                for (const row of result.valid) {

                    const blogId = blogMapping[row.blog];
                    if (!blogId) {
                        // Se blog não mapeado, talvez devêssemos marcar como erro? 
                        // Por simplicidade, vamos pular ou lançar erro. Vamos lançar erro para abortar.
                        throw new Error(`Blog '${row.blog}' não mapeado no sistema.`);
                    }

                    // Generate Idempotency Key (Hash of core fields)
                    const rawKey = `${row.blog}|${row.category}|${row.objective}|${row.theme}|${row.word_count}`;
                    const idempotencyKey = crypto.createHash('sha256').update(rawKey).digest('hex');

                    // Job Key (can be same or different, let's use hash + random for unique job key if needed, or just same)
                    const jobKey = idempotencyKey;

                    const insertJobQuery = `
                INSERT INTO jobs (
                    batch_id, job_key, idempotency_key, revision,
                    blog_key, blog_id, category, objective_pt, theme_pt,
                    language_target, word_count, status, selected
                ) VALUES (
                    $1, $2, $3, 1,
                    $4, $5, $6, $7, $8,
                    $9, $10, 'queued', false
                ) RETURNING id
            `;

                    const jobValues = [
                        batchId, jobKey, idempotencyKey,
                        row.blog, blogId, row.category, row.objective, row.theme,
                        row.language, parseInt(row.word_count)
                    ];

                    // Handle potential collision on idempotency_key?
                    // The schema has UNIQUE(idempotency_key). 
                    // If we have duplicate rows in CSV, it will fail.
                    // Use ON CONFLICT DO NOTHING? Or allow duplicates in CSV but map to same job?
                    // User requirement: "Idempotency_key -> não criar duplicado".
                    // Let's use INSERT ... ON CONFLICT DO NOTHING (or UPDATE revision?)
                    // For MVP, catch error or check existence. 
                    // Better: ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now() RETURNING id;

                    const safeInsertQuery = `
                INSERT INTO jobs (
                    batch_id, job_key, idempotency_key, revision,
                    blog_key, blog_id, category, objective_pt, theme_pt,
                    language_target, word_count, status, selected
                ) VALUES (
                    $1, $2, $3, 1,
                    $4, $5, $6, $7, $8,
                    $9, $10, 'queued', false
                ) 
                ON CONFLICT (idempotency_key) DO UPDATE 
                SET updated_at = now()
                RETURNING id;
            `;

                    const jobRes = await client.query(safeInsertQuery, jobValues);
                    if (jobRes.rows[0]) {
                        jobsCreated.push(jobRes.rows[0].id);
                    }
                }

                await client.query('COMMIT');

                res.status(201).json({
                    message: 'Upload processado e jobs criados.',
                    batch_id: batchId,
                    jobs_created: jobsCreated.length,
                    summary: {
                        total_valid: result.valid.length,
                        total_invalid: result.invalid.length,
                    },
                    errors: result.invalid
                });

            } catch (dbError: any) {
                await client.query('ROLLBACK');
                console.error('DB Transaction Error:', dbError);
                res.status(500).json({ error: 'Erro ao salvar no banco de dados', details: dbError.message });
            } finally {
                client.release();
            }

        } catch (error: any) {
            res.status(500).json({ error: 'Erro ao processar CSV', details: error.message });
        }
    }
}
