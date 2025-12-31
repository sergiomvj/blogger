import fs from 'fs';
import { parse } from 'csv-parse';
import { CsvRow, ProcessingResult } from '../types';

export class CsvService {

    static async parseFile(filePath: string): Promise<ProcessingResult> {
        const valid: CsvRow[] = [];
        const invalid: { row: any; errors: string[] }[] = [];

        const parser = fs.createReadStream(filePath).pipe(
            parse({
                columns: true,
                trim: true,
                skip_empty_lines: true,
            })
        );

        for await (const row of parser) {
            const errors = this.validateRow(row);
            if (errors.length > 0) {
                invalid.push({ row, errors });
            } else {
                // Normaliza campos básicos
                valid.push(row as CsvRow);
            }
        }

        return { valid, invalid };
    }

    private static validateRow(row: any): string[] {
        const errors: string[] = [];

        // Validar campos obrigatórios
        if (!row.blog) errors.push('Campo "blog" é obrigatório');
        if (!row.category) errors.push('Campo "category" é obrigatório');
        if (!row.objective) errors.push('Campo "objective" é obrigatório');
        if (!row.theme) errors.push('Campo "theme" é obrigatório');

        // Validar word_count
        const validCounts = ['500', '1000', '2000'];
        if (!validCounts.includes(row.word_count)) {
            errors.push(`word_count inválido. Use: ${validCounts.join(', ')}`);
        }

        // Validar language
        const validLangs = ['pt', 'en', 'es'];
        if (!validLangs.includes(row.language)) {
            errors.push(`language inválido. Use: ${validLangs.join(', ')}`);
        }

        return errors;
    }
}
