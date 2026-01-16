
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedBlog]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [articlesData, blogsData] = await Promise.all([
                api.getPublishedArticles(selectedBlog || undefined),
                api.getBlogs()
            ]);
            setArticles(articlesData);
            setBlogs(blogsData);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-32">
            <header className="sticky top-0 z-20 bg-background-dark/90 backdrop-blur-md px-4 py-4 border-b border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold">Artigos Publicados</h1>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setSelectedBlog('')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedBlog === ''
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        Todos
                    </button>
                    {blogs.map(blog => (
                        <button
                            key={blog.id}
                            onClick={() => setSelectedBlog(blog.blog_key)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedBlog === blog.blog_key
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {blog.name || blog.blog_key}
                        </button>
                    ))}
                </div>
            </header>

            <main className="p-5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">autorenew</span>
                        <p>Carregando artigos...</p>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
                        <span className="material-symbols-outlined text-6xl mb-4">article</span>
                        <p>Nenhum artigo publicado encontrado{selectedBlog ? ' para este blog' : ''}.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {articles.map(article => (
                            <a
                                key={article.id}
                                href={article.wp_post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-surface-dark border border-white/5 rounded-xl p-4 hover:border-white/20 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                                        {article.blog_key}
                                    </span>
                                    <span className="material-symbols-outlined text-slate-500 text-[18px] group-hover:text-primary transition-colors">open_in_new</span>
                                </div>
                                <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{article.title || 'Sem título'}</h3>
                                <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                    <span>{new Date(article.created_at).toLocaleDateString()}</span>
                                    <span className="text-slate-700 mx-1">•</span>
                                    <span className="material-symbols-outlined text-[14px]">folder</span>
                                    <span>{article.category}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Articles;
