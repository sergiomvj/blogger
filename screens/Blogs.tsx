import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface Blog {
    id: string;
    blog_key: string;
    blog_id: number;
    name: string;
    site_url: string;
    api_url: string;
    hmac_secret: string;
    style_key: string;
    wp_user: string;
    last_discovery: string;
    categories_json: string;
    auth_credentials?: any;
}

interface BlogsProps {
    onNavigate: (screen: Screen) => void;
}

const STYLES = [
    { key: 'analitica', name: 'Analítica / Reflexiva' },
    { key: 'informativa', name: 'Informativa / Noticiosa' },
    { key: 'narrativa', name: 'Narrativa / Storytelling' },
    { key: 'comportamental', name: 'Comportamental / Social' },
    { key: 'educacional', name: 'Educacional / Didática' },
    { key: 'satirica', name: 'Satírica / Irônica' },
];

const Blogs: React.FC<BlogsProps> = ({ onNavigate }) => {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [blogStyles, setBlogStyles] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        blog_key: '',
        blog_id: '',
        site_url: '',
        api_url: '',
        hmac_secret: '',
        style_key: 'analitica',
        wp_user: 'admin',
        application_password: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [blogsData, stylesData] = await Promise.all([
                api.getBlogs?.(),
                api.getBlogStyles?.()
            ]);
            setBlogs(blogsData || []);
            setBlogStyles(stylesData || []);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBlogs = fetchData; // Alias for backward compatibility if needed

    const handleOpenAdd = () => {
        setIsEditing(null);
        setFormData({
            blog_key: '',
            blog_id: '',
            site_url: '',
            api_url: '',
            hmac_secret: '',
            style_key: 'analitica',
            wp_user: 'admin',
            application_password: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (blog: Blog) => {
        setIsEditing(blog.id);
        setFormData({
            blog_key: blog.blog_key,
            blog_id: blog.blog_id.toString(),
            site_url: blog.site_url || '',
            api_url: blog.api_url,
            hmac_secret: blog.hmac_secret || '',
            style_key: blog.style_key || 'analitica',
            wp_user: blog.wp_user || 'admin',
            application_password: blog.auth_credentials?.password || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                blog_id: parseInt(formData.blog_id)
            };

            if (isEditing) {
                await api.updateBlog?.(isEditing, payload);
            } else {
                await api.addBlog?.(payload);
            }

            setShowModal(false);
            fetchBlogs();
        } catch (error) {
            alert('Falha ao salvar site');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este site?')) return;
        try {
            await api.deleteBlog?.(id);
            fetchBlogs();
        } catch (error) {
            alert('Falha ao excluir site');
        }
    };

    const syncBlog = async (id: string) => {
        setIsSyncing(id);
        try {
            await api.syncBlog?.(id);
            fetchBlogs();
        } catch (error) {
            alert('Sincronização falhou. Verifique a URL e a Application Password.');
        } finally {
            setIsSyncing(null);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-dark text-white">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-background-dark/95 backdrop-blur-md px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <h1 className="text-xl font-bold">Blogs Clientes</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onNavigate(Screen.PRESETS)}
                        className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">palette</span>
                        PRESETS
                    </button>
                    <button
                        onClick={handleOpenAdd}
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-glow transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        NOVO SITE
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 no-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {blogs.length === 0 && !showModal && (
                            <div className="col-span-full text-center py-20 opacity-30">
                                <span className="material-symbols-outlined text-6xl mb-4">language</span>
                                <p>Nenhum blog cadastrado ainda.</p>
                            </div>
                        )}

                        {blogs.map(blog => (
                            <div key={blog.id} className="bg-surface-dark border border-white/5 rounded-3xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenEdit(blog)}
                                        className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                        title="Editar"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(blog.id)}
                                        className="size-8 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                                        title="Excluir"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors pr-16">{blog.name || 'Site Sem Nome'}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">{blog.blog_key}</span>
                                        <span className="text-[10px] text-slate-500">ID: {blog.blog_id}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <span className="material-symbols-outlined text-lg">link</span>
                                        <span className="text-xs truncate">{blog.site_url || 'URL não definida'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <span className="material-symbols-outlined text-lg">person</span>
                                        <span className="text-xs">{blog.wp_user || 'admin'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <span className="material-symbols-outlined text-lg">palette</span>
                                        <span className="text-xs uppercase font-bold tracking-wider">
                                            {blogStyles.find(s => s.style_key === blog.style_key)?.name || blog.style_key}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase ${blog.last_discovery ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                            {blog.last_discovery ? 'Sincronizado' : 'Pendente'}
                                        </span>
                                        <span className="text-[9px] text-slate-500 italic mt-0.5">
                                            {blog.last_discovery ? `Sync: ${new Date(blog.last_discovery).toLocaleDateString()}` : 'Nunca'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => syncBlog(blog.id)}
                                        disabled={isSyncing === blog.id}
                                        className="h-10 px-4 rounded-xl bg-white/5 hover:bg-primary/20 text-primary text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <span className={`material-symbols-outlined text-sm ${isSyncing === blog.id ? 'animate-spin' : ''}`}>sync</span>
                                        {isSyncing === blog.id ? 'SYNC...' : 'SYNC'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal para Adicionar/Editar */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                        <div className="bg-surface-dark w-full max-w-lg rounded-[2rem] border border-white/10 p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
                            <h2 className="text-3xl font-bold mb-8">{isEditing ? 'Editar Site' : 'Configurar Novo Site'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Chave (blog_key)</label>
                                        <input
                                            required
                                            className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-colors"
                                            placeholder="ex: pnpmagazine"
                                            value={formData.blog_key}
                                            onChange={e => setFormData({ ...formData, blog_key: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">ID no Multisite</label>
                                        <input
                                            required type="number"
                                            className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-colors"
                                            placeholder="ex: 2"
                                            value={formData.blog_id}
                                            onChange={e => setFormData({ ...formData, blog_id: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Login (Editor/Admin)</label>
                                        <input
                                            required
                                            className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-colors"
                                            placeholder="admin"
                                            value={formData.wp_user}
                                            onChange={e => setFormData({ ...formData, wp_user: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Linha Editorial</label>
                                        <select
                                            className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none appearance-none transition-colors"
                                            value={formData.style_key}
                                            onChange={e => setFormData({ ...formData, style_key: e.target.value })}
                                        >
                                            {blogStyles.map(s => (
                                                <option key={s.style_key} value={s.style_key}>{s.name}</option>
                                            ))}
                                            {blogStyles.length === 0 && <option value="analitica">Analítica (Padrão)</option>}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">URL Púbica do Site</label>
                                        <input
                                            required
                                            className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-colors"
                                            placeholder="https://meusite.com"
                                            value={formData.site_url}
                                            onChange={e => setFormData({ ...formData, site_url: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Application Password</label>
                                        <input
                                            required type="password"
                                            className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none font-mono tracking-widest"
                                            placeholder="xxxx xxxx xxxx xxxx"
                                            value={formData.application_password}
                                            onChange={e => setFormData({ ...formData, application_password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Endpoint API Autowriter</label>
                                    <input
                                        required
                                        className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none transition-colors"
                                        placeholder="https://meusite.com/wp-json"
                                        value={formData.api_url}
                                        onChange={e => setFormData({ ...formData, api_url: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">HMAC Secret (Segurança)</label>
                                    <input
                                        required
                                        className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none font-mono"
                                        placeholder="Sua chave secreta"
                                        value={formData.hmac_secret}
                                        onChange={e => setFormData({ ...formData, hmac_secret: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-glow transition-all active:scale-95"
                                    >
                                        {isEditing ? 'ATUALIZAR' : 'SALVAR SITE'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Blogs;
