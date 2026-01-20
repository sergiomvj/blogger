
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface ArticlesProps {
    onNavigate: (screen: Screen) => void;
}

const Articles: React.FC<ArticlesProps> = ({ onNavigate }) => {
    const [articles, setArticles] = useState<any[]>([]);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [selectedBlog, setSelectedBlog] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'prontos' | 'publicados'>('prontos');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedBlog, activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'publicados' ? 'published' : 'all';
            const [articlesData, blogsData] = await Promise.all([
                api.getPublishedArticles(selectedBlog || undefined, statusFilter),
                api.getBlogs()
            ]);

            // Filter for 'Prontos' tab to exclude non-finished if 'all' returns everything
            // Assuming 'prontos' means completed generation.
            let filteredArticles = articlesData;
            if (activeTab === 'prontos') {
                filteredArticles = articlesData.filter((a: any) => ['published', 'done', 'completed'].includes(a.status));
            }

            setArticles(filteredArticles);
            setBlogs(blogsData);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-32">
            <header className="sticky top-0 z-20 bg-background-dark/90 backdrop-blur-md px-6 py-4 border-b border-white/5 flex flex-col gap-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold">Artigos</h1>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl self-start">
                    <button
                        onClick={() => setActiveTab('prontos')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'prontos'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Prontos
                    </button>
                    <button
                        onClick={() => setActiveTab('publicados')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'publicados'
                                ? 'bg-primary text-white shadow-lg'
                                : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        Publicados
                    </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setSelectedBlog('')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedBlog === ''
                            ? 'bg-white/10 text-white border-white/20'
                            : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5'
                            }`}
                    >
                        Todos os Blogs
                    </button>
                    {blogs.map(blog => (
                        <button
                            key={blog.id}
                            onClick={() => setSelectedBlog(blog.blog_key)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedBlog === blog.blog_key
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5'
                                }`}
                        >
                            {blog.name || blog.blog_key}
                        </button>
                    ))}
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">autorenew</span>
                        <p className="font-medium animate-pulse">Carregando artigos...</p>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-500 border-2 border-dashed border-white/5 rounded-3xl bg-surface-dark/30">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-50">article</span>
                        <p className="font-bold text-lg">Nenhum artigo encontrado.</p>
                        <p className="text-sm opacity-60 mt-1">Verifique a fila de produção ou mude os filtros.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {articles.map(article => (
                            <div
                                key={article.id}
                                className="bg-surface-dark border border-white/5 rounded-xl p-5 hover:border-white/20 transition-all group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 rounded bg-black/40 border border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                            {article.blog_key}
                                        </span>
                                        <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${article.status === 'published'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                            }`}>
                                            {article.status === 'published' ? 'Publicado' : 'Pronto'}
                                        </span>
                                    </div>
                                    {article.wp_post_url && (
                                        <a
                                            href={article.wp_post_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="size-8 rounded-full bg-white/5 hover:bg-primary hover:text-white flex items-center justify-center text-slate-500 transition-all"
                                            title="Ver no Wordpress"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                        </a>
                                    )}
                                </div>

                                <h3 className="font-bold text-lg mb-2 text-white group-hover:text-primary transition-colors line-clamp-2">
                                    {article.theme_pt || article.job_key}
                                </h3>

                                <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">folder</span>
                                        <span>{article.category || 'Geral'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">translate</span>
                                        <span className="uppercase">{article.language_target || 'PT'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Articles;
