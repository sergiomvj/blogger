import { Router } from 'express';
import { PipelineService } from '../services/pipeline.service';
import { pool } from '../config/database';

const router = Router();
const pipeline = new PipelineService();

// Trigger manual run for a job (Debug purposes)
router.post('/run/:jobId', async (req, res) => {
    const { jobId } = req.params;

    try {
        const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        const job = result.rows[0];
        // Async processing (fire and forget)
        pipeline.processJob(job).catch(err => console.error('Background Job Error:', err));

        res.json({ message: 'Job started', jobId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
