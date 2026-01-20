import { supabase } from './services/db.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    try {
        console.log('🌱 Starting Supabase Seeding...');

        // 1. Article Styles
        const articleStyles = [
            { key: 'opiniao', name: 'Artigo de Opinião', desc: 'Expressa um ponto de vista claro sobre um tema polêmico ou relevante.' },
            { key: 'tutorial', name: 'Artigo Educacional / Tutorial', desc: 'Ensina algo passo a passo ou explica um conceito.' },
            { key: 'analitico', name: 'Artigo Analítico / Investigativo', desc: 'Explora dados, estatísticas ou múltiplas fontes.' },
            { key: 'humor', name: 'Artigo Humorístico / Satírico', desc: 'Utiliza ironia, sarcasmo ou exagero.' },
            { key: 'lista', name: 'Lista / Listicle', desc: 'Estrutura em tópicos numerados ou em bullet points.' },
            { key: 'historico', name: 'Artigo Histórico / Linha do Tempo', desc: 'Aborda a evolução de um conceito.' },
            { key: 'noticia', name: 'Artigo de Atualidade / Notícia Comentada', desc: 'Traz uma visão crítica sobre eventos recentes.' },
            { key: 'entrevista', name: 'Entrevista ou Coluna de Convidado', desc: 'Apresenta a visão de uma personalidade.' },
            { key: 'storytelling', name: 'Storytelling / Crônica', desc: 'Usa narrativas ou casos reais.' },
            { key: 'review', name: 'Comparativo / Review', desc: 'Compara produtos, conceitos ou ideias.' }
        ];

        for (const s of articleStyles) {
            await supabase.from('article_styles').upsert({
                style_key: s.key,
                name: s.name,
                description: s.desc,
                structure_blueprint: {}
            }, { onConflict: 'style_key' });
        }
        console.log('✅ Article Styles seeded.');

        // 2. Blog Styles
        const blogStyles = [
            {
                key: 'analitica',
                name: 'Analítica / Reflexiva',
                desc: 'Explorar múltiplos lados e promover reflexão crítica.',
                tone: 'Neutro, analítico ou sóbrio.',
                audience: 'Leitores críticos.',
                guidelines: ['Contexto histórico', 'Dados de base']
            },
            {
                key: 'informativa',
                name: 'Informativa / Noticiosa',
                desc: 'Informar de forma clara, objetiva e rápida.',
                tone: 'Impessoal e direto.',
                audience: 'Leitores que buscam fatos.',
                guidelines: ['Fatos em tempo real', 'Veracidade']
            },
            {
                key: 'educacional',
                name: 'Educacional / Didática',
                desc: 'Ensinar ou explicar de forma clara.',
                tone: 'Didático e estruturado.',
                audience: 'Pessoas buscando aprender.',
                guidelines: ['Passo a passo']
            }
        ];

        for (const s of blogStyles) {
            await supabase.from('blog_styles').upsert({
                style_key: s.key,
                name: s.name,
                description: s.desc,
                tone_of_voice: s.tone,
                target_audience: s.audience,
                editorial_guidelines: s.guidelines
            }, { onConflict: 'style_key' });
        }
        console.log('✅ Blog Styles seeded.');

        console.log('✨ Supabase Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
