
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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchPreArticles();
    }, []);

    const fetchPreArticles = async () => {
        try {
            const data = await api.getPreArticles();
            setPreArticles(data);
            setSelectedIds([]); // Reset selection on refresh
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

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const pending = preArticles.filter(a => a.status === 'pending');
        if (selectedIds.length === pending.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pending.map(a => a.id));
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

    const pendingArticles = preArticles.filter(a => a.status === 'pending');
    const hasSelection = selectedIds.length > 0;

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-32">
            <header className="sticky top-0 z-20 bg-background-dark/90 backdrop-blur-md px-6 py-4 border-b border-white/5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Planejamento de Pauta</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                            {pendingArticles.length} Pendentes • {selectedIds.length} Selecionados
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {pendingArticles.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 uppercase tracking-wider"
                        >
                            {selectedIds.length === pendingArticles.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                        </button>
                    )}

                    <button
                        onClick={async () => {
                            if (!hasSelection) return;
                            if (confirm(`Confirmar envio de ${selectedIds.length} artigos para produção?`)) {
                                try {
                                    await api.startBatchFromPreArticles(selectedIds);
                                    if (confirm('Artigos enviados para a fila com sucesso!\n\nDeseja ir para a tela de monitoramento (Fila de Jobs) agora?')) {
                                        onNavigate(Screen.QUEUE);
                                    } else {
                                        fetchPreArticles();
                                    }
                                } catch (err) {
                                    alert('Erro ao iniciar produção.');
                                }
                            }
                        }}
                        disabled={!hasSelection}
                        className={`h-11 px-6 rounded-xl text-xs font-black uppercase tracking-widest shadow-glow flex items-center gap-3 transition-all ${hasSelection
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:scale-105 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale opacity-50'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{hasSelection ? 'bolt' : 'block'}</span>
                        Gerar Artigos ({selectedIds.length})
                    </button>

                    <button onClick={() => onNavigate(Screen.NEW_ARTICLE)} className="size-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto w-full">
                {preArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-dashed border-white/5 rounded-3xl bg-surface-dark/30">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-50">history_edu</span>
                        <p className="font-bold text-lg">Nenhum pré-artigo encontrado.</p>
                        <p className="text-sm opacity-60 mt-1">Adicione novos temas ou faça upload de um CSV.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {preArticles.map(article => (
                            <div key={article.id} className={`bg-surface-dark border rounded-xl p-5 transition-all group relative overflow-hidden ${selectedIds.includes(article.id)
                                ? 'border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-primary/5'
                                : 'border-white/5 hover:border-white/10'
                                }`}>
                                {/* Selection Checkbox Overlay */}
                                {article.status === 'pending' && (
                                    <div
                                        onClick={() => toggleSelection(article.id)}
                                        className="absolute left-0 top-0 bottom-0 w-12 cursor-pointer z-10 flex items-center justify-center hover:bg-white/5 transition-colors"
                                    >
                                        <div className={`size-5 rounded border flex items-center justify-center transition-all ${selectedIds.includes(article.id)
                                            ? 'bg-primary border-primary text-white'
                                            : 'border-slate-600 bg-black/40 text-transparent hover:border-slate-400'
                                            }`}>
                                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                        </div>
                                    </div>
                                )}

                                <div className={`pl-10 ${editingId === article.id ? '' : ''}`}>
                                    {editingId === article.id ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Blog Destino</label>
                                                    <input
                                                        type="text"
                                                        value={editData.blog_key || ''}
                                                        onChange={e => setEditData({ ...editData, blog_key: e.target.value })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                                                        placeholder="Ex: meublog_tech"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                                    <input
                                                        type="text"
                                                        value={editData.category || ''}
                                                        onChange={e => setEditData({ ...editData, category: e.target.value })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                                                        placeholder="Ex: Tecnologia"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tema Principal</label>
                                                <textarea
                                                    value={editData.theme || ''}
                                                    onChange={e => setEditData({ ...editData, theme: e.target.value })}
                                                    className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm font-medium"
                                                    rows={2}
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estilo de Artigo</label>
                                                    <select
                                                        value={editData.article_style_key || 'analitica'}
                                                        onChange={e => setEditData({ ...editData, article_style_key: e.target.value })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm appearance-none"
                                                    >
                                                        <option value="analitica">Analítica</option>
                                                        <option value="tutorial">Tutorial</option>
                                                        <option value="news">Notícia</option>
                                                        <option value="review">Review</option>
                                                        <option value="listicle">Lista (Top X)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Idioma</label>
                                                    <select
                                                        value={editData.language || 'pt'}
                                                        onChange={e => setEditData({ ...editData, language: e.target.value })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm appearance-none"
                                                    >
                                                        <option value="pt">Português</option>
                                                        <option value="en">Inglês</option>
                                                        <option value="es">Espanhol</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contagem Palavras</label>
                                                    <input
                                                        type="number"
                                                        value={editData.word_count || 1000}
                                                        onChange={e => setEditData({ ...editData, word_count: parseInt(e.target.value) })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Objetivo</label>
                                                    <textarea
                                                        value={editData.objective || ''}
                                                        onChange={e => setEditData({ ...editData, objective: e.target.value })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-xs"
                                                        rows={3}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Palavras-Chave (SEO)</label>
                                                    <textarea
                                                        value={editData.seo || ''}
                                                        onChange={e => setEditData({ ...editData, seo: e.target.value })}
                                                        className="w-full bg-background-dark border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary text-xs"
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSearchKeywords}
                                                    disabled={loadingKeywords}
                                                    className="flex-1 h-10 bg-violet-600/20 border border-violet-600/40 text-violet-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-violet-600/30 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">manage_search</span>
                                                    {loadingKeywords ? 'Analisando SEO...' : 'IA: Sugerir Keywords & Estrutura'}
                                                </button>
                                            </div>

                                            <div className="flex gap-2 pt-2 border-t border-white/5 mt-4">
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="flex-1 h-10 bg-white/5 border border-white/10 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    className="flex-1 h-10 bg-primary text-white rounded-lg text-sm font-bold shadow-glow hover:bg-blue-600 transition-colors"
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
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${article.status === 'converted' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        {article.status === 'converted' ? 'Em Produção' : 'Pendente'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(article)} className="text-slate-400 hover:text-white transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                                    </button>
                                                    {article.status === 'converted' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Deseja resetar o status para Pendente? Isso permitirá gerar o artigo novamente.')) {
                                                                    try {
                                                                        await api.updatePreArticle(article.id, { status: 'pending' });
                                                                        fetchPreArticles();
                                                                    } catch (e) {
                                                                        alert('Erro ao resetar status');
                                                                    }
                                                                }
                                                            }}
                                                            title="Resetar para Pendente"
                                                            className="text-amber-500/50 hover:text-amber-500 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(article.id)} className="text-rose-500/50 hover:text-rose-500 transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 onClick={() => article.status === 'pending' && toggleSelection(article.id)} className={`font-bold text-lg mb-1 line-clamp-2 ${article.status === 'pending' ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}>{article.theme}</h3>
                                            <p className="text-sm text-slate-400 mb-3 line-clamp-1 italic">{article.objective || 'Sem objetivo definido.'}</p>
                                            <div className="flex items-center justify-between mt-4 text-[10px] text-slate-500 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded">
                                                        <span className="material-symbols-outlined text-[14px]">language</span>
                                                        <span>{article.language?.toUpperCase() || 'PT'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded">
                                                        <span className="material-symbols-outlined text-[14px]">sticky_note_2</span>
                                                        <span>{article.word_count || 1000} pal.</span>
                                                    </div>
                                                </div>
                                                <span>Criado em {new Date(article.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {article.seo && (
                                                <div className="mt-3 pt-3 border-t border-white/5">
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">SEO Keywords</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {article.seo.split(',').map((tag: string, i: number) => (
                                                            <span key={i} className="px-2 py-1 rounded bg-white/5 text-emerald-400/80 text-[10px] font-medium border border-white/5">
                                                                {tag.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PreArticleReview;
