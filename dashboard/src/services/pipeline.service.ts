import { pool } from '../config/database';
import { OpenAiProvider } from './llm/providers/openai.provider';
import { RepairService } from './llm/repair.service';
import { PROMPTS } from '../prompts';
import { Job } from '../types';

export class PipelineService {
    private llmProvider: OpenAiProvider;
    private repairService: RepairService;

    constructor() {
        this.llmProvider = new OpenAiProvider(process.env.OPENAI_API_KEY || '');
        this.repairService = new RepairService(this.llmProvider);
    }

    async processJob(job: Job) {
        console.log(`[Pipeline] Processing Job ${job.id} (Step: ${job.current_step})`);

        try {
            // T0: Semantic Translation / Briefing
            if (job.current_step === 'T0') {
                await this.stepT0_SemanticBrief(job);
                await this.updateJobStatus(job.id, 'T1_OUTLINE');
            }

            // T1: Outline
            // ... next steps

        } catch (error: any) {
            console.error(`[Pipeline] Job ${job.id} Failed:`, error);
            await this.updateJobError(job.id, error.message);
        }
    }

    private async stepT0_SemanticBrief(job: Job) {
        const prompt = PROMPTS.T0_SEMANTIC_TRANSLATION
            .replace('{target_language}', job.language_target === 'pt' ? 'Portuguese' : 'English')
            .replace('{objective}', job.objective_pt || '')
            .replace('{theme}', job.theme_pt || '')
            .replace('{category}', job.category || '');

        const response = await this.llmProvider.generate({
            systemPrompt: "You are an AI Helper.",
            userPrompt: prompt,
            jsonMode: true,
            temperature: 0.7
        });

        // Save Artifact
        await this.saveArtifact(job.id, 'T0', response.content);
    }

    private async updateJobStatus(jobId: string, nextStep: string) {
        await pool.query(
            `UPDATE jobs SET current_step = $1, status = 'processing', updated_at = NOW() WHERE id = $2`,
            [nextStep, jobId]
        );
    }

    private async updateJobError(jobId: string, errorMsg: string) {
        await pool.query(
            `UPDATE jobs SET status = 'failed', last_error = $1, updated_at = NOW() WHERE id = $2`,
            [errorMsg, jobId]
        );
    }

    private async saveArtifact(jobId: string, task: string, jsonData: string) {
        await pool.query(
            `INSERT INTO job_artifacts (job_id, revision, task, json_data) 
             VALUES ($1, 1, $2, $3::jsonb)
             ON CONFLICT (job_id, revision, task) DO UPDATE SET json_data = $3::jsonb`,
            [jobId, task, jsonData]
        );
    }
}
