import { pool } from './services/db.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    try {
        console.log('🌱 Starting Seeding...');

        // 1. Article Styles
        const articleStyles = [
            {
                key: 'opiniao',
                name: 'Artigo de Opinião',
                desc: 'Expressa um ponto de vista claro sobre um tema polêmico ou relevante. Foco em engajamento e posicionamento.',
                blueprint: {
                    elements: ['Título provocador', 'Parágrafo de tese', 'Argumentos principais', 'Contra-argumento', 'CTA para debate']
                }
            },
            {
                key: 'tutorial',
                name: 'Artigo Educacional / Tutorial',
                desc: 'Ensina algo passo a passo ou explica um conceito. Foco em autoridade e utilidade prática.',
                blueprint: {
                    elements: ['Introdução com dor/problema', 'Etapas estruturadas', 'Dicas práticas', 'Checklist/Resumo']
                }
            },
            {
                key: 'analitico',
                name: 'Artigo Analítico / Investigativo',
                desc: 'Explora dados, estatísticas ou múltiplas fontes para aprofundar um tema.',
                blueprint: {
                    elements: ['Contexto', 'Dados com fontes', 'Análise interpretativa', 'Perguntas abertas']
                }
            },
            {
                key: 'humor',
                name: 'Artigo Humorístico / Satírico',
                desc: 'Utiliza ironia, sarcasmo ou exagero para comentar algo real.',
                blueprint: {
                    elements: ['Título cômico', 'Narrativa caricatural', 'Situações exageradas', 'Moral sarcástica']
                }
            },
            {
                key: 'lista',
                name: 'Lista / Listicle',
                desc: 'Estrutura em tópicos numerados ou em bullet points. Leitura rápida e escaneável.',
                blueprint: {
                    elements: ['Título com número', 'Introdução curta', 'Blocos título+explicação', 'Fechamento com ranking']
                }
            },
            {
                key: 'historico',
                name: 'Artigo Histórico / Linha do Tempo',
                desc: 'Aborda a evolução de um conceito, movimento ou evento.',
                blueprint: {
                    elements: ['Marco inicial', 'Linha do tempo', 'Destaques por período', 'Impacto histórico']
                }
            },
            {
                key: 'noticia',
                name: 'Artigo de Atualidade / Notícia Comentada',
                desc: 'Traz uma visão crítica sobre eventos recentes.',
                blueprint: {
                    elements: ['Manchete factual', 'Fontes noticiosas', 'Explicação do ocorrido', 'Comentário crítico']
                }
            },
            {
                key: 'entrevista',
                name: 'Entrevista ou Coluna de Convidado',
                desc: 'Apresenta a visão de uma personalidade ou especialista.',
                blueprint: {
                    elements: ['Mini bio', 'Introdução/Contexto', 'Perguntas/Respostas', 'Lição extraída']
                }
            },
            {
                key: 'storytelling',
                name: 'Storytelling / Crônica',
                desc: 'Usa narrativas ou casos reais para refletir sobre um tema. Conexão emocional.',
                blueprint: {
                    elements: ['Situação envolvente', 'Desenvolvimento/Conflito', 'Clímax/Virada', 'Reflexão universal']
                }
            },
            {
                key: 'review',
                name: 'Comparativo / Review',
                desc: 'Compara produtos, conceitos ou ideias com critérios definidos.',
                blueprint: {
                    elements: ['Apresentação dos comparados', 'Critérios de avaliação', 'Prós/Contras', 'Veredito final']
                }
            }
        ];

        for (const style of articleStyles) {
            await pool.query(
                `INSERT INTO article_styles (id, style_key, name, description, structure_blueprint) 
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), structure_blueprint=VALUES(structure_blueprint)`,
                [uuidv4(), style.key, style.name, style.desc, JSON.stringify(style.blueprint)]
            );
        }
        console.log('✅ Article Styles seeded.');

        // 2. Blog Styles
        const blogStyles = [
            {
                key: 'analitica',
                name: 'Analítica / Reflexiva',
                desc: 'Explorar múltiplos lados, contextualizar e promover reflexão crítica.',
                tone: 'Neutro, analítico ou sóbrio (pode conter sarcasmo).',
                audience: 'Leitores críticos e interessados em profundidade.',
                guidelines: ['Contexto histórico', 'Dados de base', 'Contrapontos reais', 'Incentivo ao questionamento']
            },
            {
                key: 'informativa',
                name: 'Informativa / Noticiosa',
                desc: 'Informar de forma clara, objetiva e rápida.',
                tone: 'Impessoal e direto.',
                audience: 'Leitores que buscam fatos e atualizações rápidas.',
                guidelines: ['Fatos em tempo real', 'Veracidade', 'Clareza', 'Breaking news contextualizado']
            },
            {
                key: 'educacional',
                name: 'Educacional / Didática',
                desc: 'Ensinar ou explicar de forma clara e acessível.',
                tone: 'Didático, paciente e estruturado. Simplifica sem perder densidade.',
                audience: 'Iniciantes ou pessoas buscando aprender novas habilidades.',
                guidelines: ['Passo a passo', 'Listas e exemplos', 'Metáforas explicativas']
            },
            {
                key: 'satirica',
                name: 'Satírica / Irônica',
                desc: 'Criticar com humor e ironia inteligente.',
                tone: 'Provocativo, criativo e não convencional.',
                audience: 'Jovens adultos, pessoas que apreciam humor ácido e crítica social.',
                guidelines: ['Linguagem não convencional', 'Temas sérios com humor', 'Viralização']
            },
            {
                key: 'comportamental',
                name: 'Comportamental / Social',
                desc: 'Explorar dilemas, hábitos e fenômenos humanos.',
                tone: 'Empático e observador.',
                audience: 'Pessoas interessadas em psicologia, sociedade e relações.',
                guidelines: ['Abordagem contemporânea', 'Foco emocional', 'Dados antropológicos']
            }
        ];

        for (const style of blogStyles) {
            await pool.query(
                `INSERT INTO blog_styles (id, style_key, name, description, tone_of_voice, target_audience, editorial_guidelines) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), tone_of_voice=VALUES(tone_of_voice), 
                                     target_audience=VALUES(target_audience), editorial_guidelines=VALUES(editorial_guidelines)`,
                [uuidv4(), style.key, style.name, style.desc, style.tone, style.audience, JSON.stringify(style.guidelines)]
            );
        }
        console.log('✅ Blog Styles seeded.');

        // 3. Blogs (Seed PnP)
        const blogs = [
            {
                key: 'pnp',
                blog_id: 1,
                name: 'Pulse & Perspective',
                site_url: 'https://pnp.megablog.top',
                api_url: 'https://pnp.megablog.top/wp-json',
                style_key: 'analitica'
            }
        ];

        for (const blog of blogs) {
            await pool.query(
                `INSERT INTO blogs (id, blog_key, blog_id, name, site_url, api_url, style_key, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), site_url=VALUES(site_url), api_url=VALUES(api_url), style_key=VALUES(style_key)`,
                [uuidv4(), blog.key, blog.blog_id, blog.name, blog.site_url, blog.api_url, blog.style_key]
            );
        }
        console.log('✅ Default Blogs seeded.');

        console.log('✨ Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
