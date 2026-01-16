
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface NewArticleProps {
    onNavigate: (screen: Screen) => void;
}

const NewArticle: React.FC<NewArticleProps> = ({ onNavigate }) => {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [articleStyles, setArticleStyles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        blog_key: '',
        category: '',
        article_style_key: '',
        objective: '',
        theme: '',
        word_count: 1000,
        language: 'pt',
        seo: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [blogsData, stylesData] = await Promise.all([
                    api.getBlogs(),
                    api.getArticleStyles()
                ]);
                setBlogs(blogsData);
                setArticleStyles(stylesData);
                if (blogsData.length > 0) {
                    setFormData(prev => ({ ...prev, blog_key: blogsData[0].blog_key }));
                }
                if (stylesData.length > 0) {
                    setFormData(prev => ({ ...prev, article_style_key: stylesData[0].style_key }));
                }
            } catch (error) {
                console.error('Failed to fetch initial data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.savePreArticle(formData);
            onNavigate(Screen.PRE_ARTICLE_REVIEW);
        } catch (error) {
            console.error('Failed to save pre-article:', error);
            alert('Erro ao salvar pré-artigo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-white p-6">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                <p className="mt-4 text-slate-400">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-32">
            <header className="sticky top-0 z-20 bg-background-dark/90 backdrop-blur-md px-4 py-4 border-b border-white/5 flex items-center gap-4">
                <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold">Novo Artigo</h1>
            </header>

            <main className="p-5">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Blog de Destino</label>
                            <select
                                name="blog_key"
                                value={formData.blog_key}
                                onChange={handleChange}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                required
                            >
                                {blogs.map(blog => (
                                    <option key={blog.id} value={blog.blog_key}>{blog.name || blog.blog_key}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoria</label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="Ex: Tecnologia, Saúde..."
                                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estilo do Artigo</label>
                                <select
                                    name="article_style_key"
                                    value={formData.article_style_key}
                                    onChange={handleChange}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                    required
                                >
                                    {articleStyles.map(style => (
                                        <option key={style.id} value={style.style_key}>{style.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Idioma</label>
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleChange}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                >
                                    <option value="pt">Português (BR)</option>
                                    <option value="en">English (US)</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Objetivo do Artigo</label>
                            <input
                                type="text"
                                name="objective"
                                value={formData.objective}
                                onChange={handleChange}
                                placeholder="Ex: Vender um curso, Gerar leads..."
                                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tema / Título Base</label>
                            <textarea
                                name="theme"
                                value={formData.theme}
                                onChange={handleChange}
                                placeholder="Sobre o que será o artigo?"
                                rows={3}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contagem de Palavras</label>
                            <input
                                type="number"
                                name="word_count"
                                value={formData.word_count}
                                onChange={handleChange}
                                step={100}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 truncate">SEO (Keywords / cauda longa - Opcional)</label>
                            <textarea
                                name="seo"
                                value={formData.seo}
                                onChange={handleChange}
                                placeholder="Palavras-chave separadas por vírgula. Deixe vazio para busca automática."
                                rows={2}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors resize-none text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-14 bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-3 mt-4"
                    >
                        {submitting ? (
                            <span className="material-symbols-outlined animate-spin">autorenew</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-white">magic_button</span>
                                <span className="text-white font-bold text-lg">Salvar Pré-Artigo</span>
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default NewArticle;
