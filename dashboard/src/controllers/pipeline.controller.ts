import { Request, Response } from 'express';
import { PipelineService } from '../services/pipeline/pipeline.service';

const pipelineService = new PipelineService();

export class PipelineController {
    static async runNextJob(req: Request, res: Response) {
        try {
            await pipelineService.processNextJob();
            res.json({ message: 'Processed next job check logs for details' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
