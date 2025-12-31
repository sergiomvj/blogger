import fs from 'fs';
import path from 'path';

export const logDebug = (msg: string) => {
    const logPath = 'c:/Projetos/BlogPlugin/dashboard/debug_llm.log';
    fs.appendFileSync(logPath, msg + '\n');
}
