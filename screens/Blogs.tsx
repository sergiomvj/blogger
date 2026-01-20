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
    architecture: 'NEW' | 'EXISTING';
}

interface BlogsProps {
    onNavigate: (screen: Screen) => void;
}

type WizardStep = 'CHOICE' | 'CONFIG' | 'INSTALL_GUIDE';
type BlogType = 'NEW' | 'EXISTING';

const Blogs: React.FC<BlogsProps> = ({ onNavigate }) => {
    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [blogStyles, setBlogStyles] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [wizardStep, setWizardStep] = useState<WizardStep>('CHOICE');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        blog_key: '',
        blog_id: '',
        site_url: '',
        api_url: '',
        hmac_secret: '',
        style_key: 'analitica',
        wp_user: 'admin',
        application_password: '',
        architecture: 'EXISTING' as BlogType
    });

    useEffect(() => {
        fetchData();
    }, []);

    const handleArchitectureChange = (type: BlogType) => {
        const base = formData.site_url.endsWith('/') ? formData.site_url.slice(0, -1) : formData.site_url;
        const standardPath = type === 'NEW' ? '/api/autowriter' : '/wp-json';

        if (base) {
            setFormData(prev => ({ ...prev, api_url: `${base}${standardPath}`, architecture: type }));
        } else {
            setFormData(prev => ({ ...prev, architecture: type }));
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [blogsData, stylesData] = await Promise.all([
                api.getBlogs?.(),
                api.getBlogStyles?.()
            ]);
            setBlogs(Array.isArray(blogsData) ? blogsData : []);
            setBlogStyles(Array.isArray(stylesData) ? stylesData : []);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setIsEditing(null);
        setWizardStep('CHOICE');
        const generatedPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-6).toUpperCase();
        setFormData({
            name: '',
            blog_key: `blog_${Date.now().toString().slice(-6)}`,
            blog_id: '1',
            site_url: '',
            api_url: '',
            hmac_secret: Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''),
            style_key: 'analitica',
            wp_user: 'lionguava',
            application_password: generatedPass,
            architecture: 'EXISTING'
        });
        setShowModal(true);
    };

    const handleOpenEdit = (blog: Blog) => {
        setIsEditing(blog.id);
        setWizardStep('CONFIG');
        setFormData({
            name: blog.name || '',
            blog_key: blog.blog_key,
            blog_id: blog.blog_id.toString(),
            site_url: blog.site_url || '',
            api_url: blog.api_url,
            hmac_secret: blog.hmac_secret || '',
            style_key: blog.style_key || 'analitica',
            wp_user: blog.wp_user || 'admin',
            application_password: blog.auth_credentials?.password || '',
            architecture: blog.architecture || 'EXISTING'
        });
        setShowModal(true);
    };

    const handleChoice = (type: BlogType) => {
        handleArchitectureChange(type);
        setWizardStep('CONFIG');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Standardize api_url if empty
            let finalApiUrl = formData.api_url;
            if (!finalApiUrl && formData.site_url) {
                const base = formData.site_url.endsWith('/') ? formData.site_url.slice(0, -1) : formData.site_url;
                finalApiUrl = formData.architecture === 'NEW' ? `${base}/api/autowriter` : `${base}/wp-json`;
            }

            const payload = {
                ...formData,
                api_url: finalApiUrl,
                blog_id: parseInt(formData.blog_id) || 1
            };

            if (isEditing) {
                await api.updateBlog?.(isEditing, payload);
                setShowModal(false);
            } else {
                await api.addBlog?.(payload);
                if (formData.architecture === 'NEW') {
                    setWizardStep('INSTALL_GUIDE');
                } else {
                    setShowModal(false);
                }
            }
            fetchData();
        } catch (error) {
            alert('Falha ao salvar site');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este site?')) return;
        try {
            await api.deleteBlog?.(id);
            fetchData();
        } catch (error) {
            alert('Falha ao excluir site');
        }
    };

    const syncBlog = async (id: string) => {
        setIsSyncing(id);
        try {
            await api.syncBlog?.(id);
            fetchData();
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
                    <h1 className="text-xl font-black italic uppercase tracking-tight">Network de Blogs</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenAdd}
                        className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest shadow-glow transition-all active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        Conectar Novo
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
                            <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-30 text-center">
                                <div className="size-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-5xl">language</span>
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-tight">Nenhum blog conectado</h3>
                                <p className="text-sm mt-1">Sua rede de distribuição começa aqui.</p>
                            </div>
                        )}

                        {blogs.map(blog => (
                            <div key={blog.id} className="bg-surface-dark border border-white/5 rounded-3xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenEdit(blog)}
                                        className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">settings_suggest</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(blog.id)}
                                        className="size-8 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>

                                <div className="mb-6 flex items-center gap-4">
                                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined text-2xl font-variation-fill-1">public</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black uppercase italic tracking-tight text-white group-hover:text-primary transition-colors truncate">
                                            {blog.name || 'Sem Nome'}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{blog.site_url}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Estilo</p>
                                        <p className="text-[11px] font-black text-slate-300 mt-1 uppercase">
                                            {blogStyles.find(s => s.style_key === blog.style_key)?.name || blog.style_key}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">WP User</p>
                                        <p className="text-[11px] font-black text-slate-300 mt-1">{blog.wp_user}</p>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    name: blog.name,
                                                    hmac_secret: blog.hmac_secret,
                                                    wp_user: blog.wp_user,
                                                    api_url: blog.api_url
                                                });
                                                setWizardStep('INSTALL_GUIDE');
                                                setShowModal(true);
                                            }}
                                            className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5"
                                            title="Guia de Instalação"
                                        >
                                            <span className="material-symbols-outlined text-sm">menu_book</span>
                                        </button>
                                        <div className="flex flex-col justify-center">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`size-1.5 rounded-full ${blog.last_discovery ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${blog.last_discovery ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                                    {blog.last_discovery ? 'Online' : 'Pending'}
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-slate-500 italic mt-0.5">
                                                {blog.last_discovery ? `Sync: ${new Date(blog.last_discovery).toLocaleDateString()}` : 'Nunca'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => syncBlog(blog.id)}
                                        disabled={isSyncing === blog.id}
                                        className="h-10 px-5 rounded-xl bg-white/5 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 border border-white/5"
                                    >
                                        <span className={`material-symbols-outlined text-sm ${isSyncing === blog.id ? 'animate-spin' : ''}`}>sync</span>
                                        {isSyncing === blog.id ? '...' : 'Verificar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Wizard Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                        <div className="bg-surface-dark w-full max-w-2xl rounded-[3rem] border border-white/10 overflow-hidden shadow-3xl">

                            {/* Step 1: CHOICE */}
                            {wizardStep === 'CHOICE' && (
                                <div className="p-12">
                                    <div className="text-center mb-12">
                                        <h2 className="text-4xl font-black italic uppercase tracking-tight mb-4">Novo Blog</h2>
                                        <p className="text-slate-400 max-w-sm mx-auto">Como você deseja integrar sua infraestrutura ao BLOGGER?</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <button
                                            onClick={() => handleChoice('NEW')}
                                            className="p-8 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 hover:border-primary/50 transition-all text-left group"
                                        >
                                            <div className="size-14 rounded-2xl bg-primary flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-3xl">add_box</span>
                                            </div>
                                            <h4 className="text-xl font-black italic uppercase tracking-tight mb-2">Projeto Custom/Novo</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed font-medium">Ideal para blogs novos, React, Node.js ou qualquer site que precise de instruções de instalação.</p>
                                        </button>

                                        <button
                                            onClick={() => handleChoice('EXISTING')}
                                            className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group"
                                        >
                                            <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center text-slate-300 mb-6 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-3xl">wordpress</span>
                                            </div>
                                            <h4 className="text-xl font-black italic uppercase tracking-tight mb-2">WordPress Hub</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">Conecte um blog WordPress já existente usando as chaves de API e Application Password.</p>
                                        </button>
                                    </div>

                                    <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
                                        <button onClick={() => setShowModal(false)} className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Fechar</button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: CONFIG */}
                            {wizardStep === 'CONFIG' && (
                                <div className="p-12">
                                    <div className="flex items-center justify-between mb-8">
                                        <button onClick={() => setWizardStep('CHOICE')} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">arrow_back</span>
                                        </button>
                                        <div className="text-center">
                                            <h2 className="text-2xl font-black italic uppercase tracking-tight">Configuração</h2>
                                        </div>
                                        <div className="size-10"></div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Amigável do Blog</label>
                                                <input
                                                    required
                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Site URL (Público)</label>
                                                <input
                                                    required
                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                                                    value={formData.site_url}
                                                    onChange={e => setFormData({ ...formData, site_url: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Linha Editorial</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                                                    value={formData.style_key}
                                                    onChange={e => setFormData({ ...formData, style_key: e.target.value })}
                                                >
                                                    <option value="" disabled>Selecione um Estilo</option>
                                                    {blogStyles.map(s => (
                                                        <option key={s.style_key} value={s.style_key}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Arquitetura do Blog</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleArchitectureChange('EXISTING')}
                                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-bold text-xs uppercase tracking-widest ${formData.architecture === 'EXISTING' ? 'bg-primary border-primary text-white' : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">wordpress</span>
                                                        WordPress Hub
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleArchitectureChange('NEW')}
                                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-bold text-xs uppercase tracking-widest ${formData.architecture === 'NEW' ? 'bg-primary border-primary text-white' : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">deployed_code</span>
                                                        Custom Blog
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                                    API Endpoint Target
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none pr-12"
                                                        value={formData.api_url}
                                                        placeholder="https://seu-site.com/wp-json"
                                                        onChange={e => setFormData({ ...formData, api_url: e.target.value })}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-50">
                                                        <span className="material-symbols-outlined text-xl">auto_fix_high</span>
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-slate-500 mt-2 italic px-1 font-medium">
                                                    {formData.architecture === 'EXISTING' ? 'Detectado: Padrão REST do WordPress' : 'Detectado: Padrão BLOGGER Starter Kit'}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">
                                                        {formData.architecture === 'EXISTING' ? 'WP User' : 'Admin User'}
                                                    </label>
                                                    <input
                                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs focus:border-primary outline-none"
                                                        value={formData.wp_user}
                                                        placeholder={formData.architecture === 'EXISTING' ? 'Ex: admin' : 'Ex: lionguava'}
                                                        onChange={e => setFormData({ ...formData, wp_user: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">
                                                        {formData.architecture === 'EXISTING' ? 'Application Password' : 'HMAC Secret / Key'}
                                                    </label>
                                                    <input
                                                        type="password"
                                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs focus:border-primary outline-none"
                                                        value={formData.application_password}
                                                        placeholder="••••••••••••••••"
                                                        onChange={e => setFormData({ ...formData, application_password: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-primary py-5 rounded-2xl text-white font-black uppercase tracking-widest">
                                            {isEditing ? 'Atualizar' : 'Salvar'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Step 3: INSTALL_GUIDE */}
                            {wizardStep === 'INSTALL_GUIDE' && (
                                <div className="p-12 overflow-y-auto max-h-[85vh]">
                                    <div className="text-center mb-10">
                                        <h2 className="text-3xl font-black italic uppercase tracking-tight">Pronto para Instalar!</h2>
                                        <p className="text-slate-400 mt-2">Siga estes passos:</p>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex gap-6">
                                            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-black italic text-primary">1</div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white mb-2 uppercase text-xs">Banco de Dados</h4>
                                                <div className="bg-black/60 p-6 rounded-2xl border border-white/10">
                                                    <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                                                        {`CREATE TABLE IF NOT EXISTS blog_config (key TEXT PRIMARY KEY, value TEXT);\nCREATE TABLE IF NOT EXISTS blog_users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, role TEXT);\n\nINSERT INTO blog_config (key, value) VALUES ('hmac_secret', '${formData.hmac_secret}');\nINSERT INTO blog_users (id, username, password_hash, role) VALUES ('${Date.now()}', 'lionguava', '${formData.application_password}', 'superadmin');`}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-6">
                                            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-black italic text-primary">2</div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white mb-2 uppercase text-xs">Segredo HMAC</h4>
                                                <code className="bg-white/5 px-4 py-2 rounded-xl text-primary font-mono text-sm block border border-primary/20">{formData.hmac_secret}</code>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 pt-4">
                                            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-black italic text-primary">3</div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white mb-2 uppercase text-xs">Considerações</h4>
                                                <p className="text-xs text-slate-400">Após o deploy, atualize o "API Endpoint" nas configurações.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="mt-8 w-full bg-white text-black font-black uppercase tracking-widest py-5 rounded-2xl"
                                    >
                                        Concluir
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Blogs;
