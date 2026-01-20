import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface SEOIntelligenceProps {
    onNavigate: (screen: Screen) => void;
}

const SEOIntelligence: React.FC<SEOIntelligenceProps> = ({ onNavigate }) => {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' | 'projects'
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const data = await api.getSEOCandidates();
            setCandidates(data);
        } catch (err) {
            console.error('Failed to fetch SEO candidates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRunAnalysis = async (candidate: any) => {
        setAnalyzingId(candidate.id);
        try {
            const result = await api.analyzeSEO(candidate.id, candidate.source);
            if (result.success) {
                alert('Análise de SEO concluída e aplicada!');
                fetchCandidates();
                if (candidate.source === 'job') {
                    setSelectedItem(result.data);
                }
            } else {
                alert('Erro na análise: ' + result.error);
            }
        } catch (err) {
            alert('Falha na comunicação com o servidor.');
        } finally {
            setAnalyzingId(null);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-dark text-white">
            <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black italic tracking-tight uppercase leading-none">SEO Intelligence</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Audit & Semantic Optimization Engine</p>
                        </div>
                    </div>
                </div>

                <div className="px-8 flex gap-8">
                    <button
                        onClick={() => setActiveTab('candidates')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'candidates' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Candidatos a SEO
                        {activeTab === 'candidates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-glow"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'projects' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Projetos Estratégicos
                        {activeTab === 'projects' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-glow"></div>}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-spin">
                                <span className="material-symbols-outlined text-primary">sync</span>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Escaneando Artigos...</p>
                        </div>
                    ) : activeTab === 'candidates' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Fila de Otimização Semântica</h2>
                                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-500 font-bold uppercase">{candidates.length} Itens Encontrados</span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {candidates.map((article) => (
                                    <div key={article.id} className="bg-surface-dark/50 backdrop-blur-sm rounded-2xl border border-white/5 p-5 flex flex-col md:flex-row items-center gap-6 hover:border-primary/30 transition-all group overflow-hidden relative">
                                        {/* Status Glow Indicator */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${article.is_published ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'}`}></div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${article.source === 'pre' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'}`}>
                                                    {article.source === 'pre' ? 'Pré-Artigo' : 'Artigo Final'}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">{article.blog_key} • {article.category}</span>
                                            </div>
                                            <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-tight">{article.title}</h3>
                                            <div className="mt-3 flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                    {new Date(article.created_at).toLocaleDateString()}
                                                </div>
                                                {article.is_published && (
                                                    <a href={article.wp_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-green-500 hover:underline">
                                                        <span className="material-symbols-outlined text-[14px]">public</span>
                                                        Publicado
                                                    </a>
                                                )}
                                                {!article.is_published && article.source === 'job' && (
                                                    <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase">
                                                        <span className="material-symbols-outlined text-[14px]">draft</span>
                                                        Não Publicado
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {article.source === 'pre' && article.seo && (
                                                <div className="hidden lg:flex flex-col items-end mr-4">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">SEO Data</span>
                                                    <div className="flex gap-1">
                                                        <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleRunAnalysis(article)}
                                                disabled={analyzingId === article.id}
                                                className={`h-11 px-6 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 ${analyzingId === article.id
                                                        ? 'bg-slate-800 text-slate-500'
                                                        : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-blue-600 hover:shadow-primary/40'
                                                    }`}
                                            >
                                                {analyzingId === article.id ? (
                                                    <>
                                                        <div className="size-4 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
                                                        Analisando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                                                        Iniciar Análise
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center text-center space-y-6 grayscale">
                            <div className="size-24 rounded-full bg-white/5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-600 text-[48px]">folder_special</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-400">Módulo de Projetos</h3>
                                <p className="text-xs text-slate-500 max-w-sm mt-2">Agrupe seus artigos em projetos para análises semânticas de nicho e rastreamento de ranking.</p>
                            </div>
                            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/10 transition-all cursor-not-allowed">
                                Em Breve
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SEOIntelligence;
