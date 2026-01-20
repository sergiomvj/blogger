
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface PreArticleReviewProps {
    onNavigate: (screen: Screen) => void;
}

const PreArticleReview: React.FC<PreArticleReviewProps> = ({ onNavigate }) => {
    const [preArticles, setPreArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [loadingKeywords, setLoadingKeywords] = useState(false);

    useEffect(() => {
        fetchPreArticles();
    }, []);

    const fetchPreArticles = async () => {
        try {
            const data = await api.getPreArticles();
            setPreArticles(data);
        } catch (error) {
            console.error('Failed to fetch pre-articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (article: any) => {
        setEditingId(article.id);
        setEditData({ ...article });
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            await api.updatePreArticle(editingId, editData);
            setEditingId(null);
            fetchPreArticles();
        } catch (error) {
            console.error('Failed to update pre-article:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este pré-artigo?')) return;
        try {
            await api.deletePreArticle(id);
            fetchPreArticles();
        } catch (error) {
            console.error('Failed to delete pre-article:', error);
        }
    };

    const handleSearchKeywords = async () => {
        if (!editData) return;
        setLoadingKeywords(true);
        try {
            const result = await api.searchKeywords({
                theme: editData.theme,
                objective: editData.objective,
                language: editData.language
            });
            if (result.keywords) {
                setEditData(prev => ({ ...prev, seo: result.keywords }));
            }
        } catch (error) {
            console.error('Failed to search keywords:', error);
        } finally {
            setLoadingKeywords(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-6">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                <p className="mt-4 text-slate-400">Carregando pré-artigos...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-32">
            <header className="sticky top-0 z-20 bg-background-dark/90 backdrop-blur-md px-4 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold">Revisar Pré-Artigos</h1>
                </div>
                <div className="flex items-center gap-2">
                    {preArticles.length > 0 && preArticles.some(a => !a.processed) && (
                        <button
                            onClick={async () => {
                                if (confirm(`Deseja iniciar a produção de ${preArticles.filter(a => !a.processed).length} artigos?`)) {
                                    try {
                                        await api.startBatchFromPreArticles();
                                        alert('Lote enviado para processamento!');
                                        fetchPreArticles();
                                    } catch (err) {
                                        alert('Erro ao iniciar lote.');
                                    }
                                }
                            }}
                            className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest shadow-glow-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                            Produzir Lote
                        </button>
                    )}
                    <button onClick={() => onNavigate(Screen.NEW_ARTICLE)} className="size-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </header>

            <main className="p-5">
                {preArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <span className="material-symbols-outlined text-6xl mb-4">history_edu</span>
                        <p>Nenhum pré-artigo encontrado.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {preArticles.map(article => (
                            <div key={article.id} className="bg-surface-dark border border-white/5 rounded-xl p-4 overflow-hidden relative">
                                {editingId === article.id ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema</label>
                                            <textarea
                                                value={editData.theme}
                                                onChange={e => setEditData({ ...editData, theme: e.target.value })}
                                                className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                                                rows={2}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Objetivo</label>
                                                <input
                                                    type="text"
                                                    value={editData.objective}
                                                    onChange={e => setEditData({ ...editData, objective: e.target.value })}
                                                    className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Palavras-Chave (SEO)</label>
                                                <textarea
                                                    value={editData.seo}
                                                    onChange={e => setEditData({ ...editData, seo: e.target.value })}
                                                    className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-xs"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSearchKeywords}
                                                disabled={loadingKeywords}
                                                className="flex-1 h-10 bg-violet-600/20 border border-violet-600/40 text-violet-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">search</span>
                                                {loadingKeywords ? 'Buscando...' : 'IA: Sugerir Keywords'}
                                            </button>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex-1 h-10 bg-white/5 border border-white/10 rounded-lg text-sm font-bold"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="flex-1 h-10 bg-primary text-white rounded-lg text-sm font-bold"
                                            >
                                                Salvar Alterações
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                                    {article.blog_key}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${article.processed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {article.processed ? 'Processado' : 'Pendente'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(article)} className="text-slate-400 hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(article.id)} className="text-rose-500/50 hover:text-rose-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-sm mb-1 line-clamp-2">{article.theme}</h3>
                                        <p className="text-xs text-slate-400 mb-3 line-clamp-1 italic">{article.objective}</p>
                                        <div className="flex items-center justify-between mt-4 text-[10px] text-slate-500 font-medium">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[12px]">language</span>
                                                <span>{article.language.toUpperCase()}</span>
                                                <span className="text-slate-700">|</span>
                                                <span className="material-symbols-outlined text-[12px]">sticky_note_2</span>
                                                <span>{article.word_count} pal.</span>
                                            </div>
                                            <span>{new Date(article.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {article.seo && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">SEO Keywords</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {article.seo.split(',').map((tag: string, i: number) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 text-[9px] truncate max-w-[100px]">
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PreArticleReview;
