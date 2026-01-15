import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface BlogStyle {
    id: string;
    style_key: string;
    name: string;
    description: string;
    tone_of_voice: string;
    target_audience: string;
    editorial_guidelines: string[] | string;
    cta_config: any;
    forbidden_terms: string[] | string;
}

interface PresetsProps {
    onNavigate: (screen: Screen) => void;
}

const Presets: React.FC<PresetsProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'blog' | 'article'>('blog');
    const [blogStyles, setBlogStyles] = useState<BlogStyle[]>([]);
    const [articleStyles, setArticleStyles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const [formData, setFormData] = useState<any>({
        style_key: '',
        name: '',
        description: '',
        tone_of_voice: '',
        target_audience: '',
        editorial_guidelines: '',
        cta_config: '',
        forbidden_terms: '',
        structure_blueprint: '',
        typical_word_count: 1000
    });

    useEffect(() => {
        fetchStyles();
    }, []);

    const fetchStyles = async () => {
        setIsLoading(true);
        try {
            const [bData, aData] = await Promise.all([
                api.getBlogStyles(),
                api.getArticleStyles()
            ]);
            setBlogStyles(bData);
            setArticleStyles(aData);
        } catch (error) {
            console.error('Failed to fetch styles', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setIsEditing(null);
        setFormData({
            style_key: '',
            name: '',
            description: '',
            tone_of_voice: '',
            target_audience: '',
            editorial_guidelines: '',
            cta_config: '',
            forbidden_terms: '',
            structure_blueprint: activeTab === 'article' ? '["Intro", "Body", "Conclusion"]' : '',
            typical_word_count: 1000
        });
        setShowModal(true);
    };

    const handleOpenEdit = (item: any) => {
        setIsEditing(item.id);
        if (activeTab === 'blog') {
            setFormData({
                style_key: item.style_key,
                name: item.name,
                description: item.description || '',
                tone_of_voice: item.tone_of_voice || '',
                target_audience: item.target_audience || '',
                editorial_guidelines: Array.isArray(item.editorial_guidelines) ? item.editorial_guidelines.join('\n') : (item.editorial_guidelines || ''),
                cta_config: typeof item.cta_config === 'object' ? JSON.stringify(item.cta_config, null, 2) : (item.cta_config || ''),
                forbidden_terms: Array.isArray(item.forbidden_terms) ? item.forbidden_terms.join('\n') : (item.forbidden_terms || '')
            });
        } else {
            setFormData({
                style_key: item.style_key,
                name: item.name,
                description: item.description || '',
                structure_blueprint: typeof item.structure_blueprint === 'object' ? JSON.stringify(item.structure_blueprint, null, 2) : (item.structure_blueprint || ''),
                typical_word_count: item.typical_word_count || 1000
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === 'blog') {
                const payload = {
                    ...formData,
                    editorial_guidelines: formData.editorial_guidelines.split('\n').filter((l: string) => l.trim()),
                    forbidden_terms: formData.forbidden_terms.split('\n').filter((l: string) => l.trim()),
                    cta_config: formData.cta_config ? JSON.parse(formData.cta_config) : []
                };
                if (isEditing) await api.updateBlogStyle(isEditing, payload);
                else await api.addBlogStyle(payload);
            } else {
                // Article style persistence (needs backend implementation or reuse)
                // Assuming we have updateArticleStyle etc in api.ts
                alert('Gestão de Article Styles via UI (Save) pendente de backend dedicado ou já existente.');
            }

            setShowModal(false);
            fetchStyles();
        } catch (error: any) {
            alert('Falha ao salvar: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-dark text-white">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-background-dark/95 backdrop-blur-md px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(Screen.BLOGS)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Configurações de Marca</h1>
                        <div className="flex gap-4 mt-1">
                            <button
                                onClick={() => setActiveTab('blog')}
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${activeTab === 'blog' ? 'bg-primary text-white' : 'text-slate-500'}`}
                            >
                                Blogs Presets
                            </button>
                            <button
                                onClick={() => setActiveTab('article')}
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${activeTab === 'article' ? 'bg-primary text-white' : 'text-slate-500'}`}
                            >
                                Article Formats
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-glow transition-all active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    NOVO {activeTab === 'blog' ? 'PRESET' : 'FORMATO'}
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 no-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(activeTab === 'blog' ? blogStyles : articleStyles).map((item: any) => (
                            <div key={item.id} className="bg-surface-dark border border-white/5 rounded-3xl p-6 hover:border-primary/30 transition-all group overflow-hidden flex flex-col relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">{item.style_key}</span>
                                        <h3 className="text-lg font-bold mt-1">{item.name}</h3>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenEdit(style)} className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-400 line-clamp-2 mb-6 h-8">{style.description || 'Sem descrição.'}</p>

                                <div className="space-y-4 flex-1">
                                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Tom de Voz</p>
                                        <p className="text-[11px] text-slate-300 italic">"{style.tone_of_voice}"</p>
                                    </div>
                                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Público-Alvo</p>
                                        <p className="text-[11px] text-slate-300">{style.target_audience}</p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="size-6 rounded-full border border-background-dark bg-slate-800 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[10px] text-slate-500">
                                                    {i === 1 ? 'article' : i === 2 ? 'ads_click' : 'block'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Configurado</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                    <div className="bg-surface-dark border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold">{isEditing ? 'Editar' : 'Criar Novo'} {activeTab === 'blog' ? 'Preset de Blog' : 'Formato de Artigo'}</h2>
                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-black">
                                        {activeTab === 'blog' ? 'Persona & Guidelines' : 'Structure & Length'}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-500">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Chave Única (Style Key)</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="ex: tech_blog"
                                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                            value={formData.style_key}
                                            onChange={e => setFormData({ ...formData, style_key: e.target.value })}
                                            disabled={!!isEditing}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Nome de Exibição</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="ex: Blog de Tecnologia"
                                            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Descrição Curta</label>
                                    <textarea
                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all h-20 resize-none"
                                        placeholder="Explique quando usar este preset..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {activeTab === 'blog' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Tom de Voz</label>
                                                <input
                                                    type="text"
                                                    placeholder="ex: Profissional, Amigável"
                                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    value={formData.tone_of_voice}
                                                    onChange={e => setFormData({ ...formData, tone_of_voice: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Público Alvo</label>
                                                <input
                                                    type="text"
                                                    placeholder="ex: Desenvolvedores, CEOs"
                                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                                    value={formData.target_audience}
                                                    onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Guidelines (1 por linha)</label>
                                                <textarea
                                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[11px] focus:ring-1 focus:ring-primary outline-none transition-all h-32 resize-none"
                                                    placeholder="Evite jargões\nUse voz ativa..."
                                                    value={formData.editorial_guidelines}
                                                    onChange={e => setFormData({ ...formData, editorial_guidelines: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Termos Proibidos (Blacklist)</label>
                                                <textarea
                                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[11px] focus:ring-1 focus:ring-primary outline-none transition-all h-32 resize-none"
                                                    placeholder="Palavras proibidas (1 por linha)..."
                                                    value={formData.forbidden_terms}
                                                    onChange={e => setFormData({ ...formData, forbidden_terms: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Chamadas para Ação (CTA Config JSON)</label>
                                            <textarea
                                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-mono focus:ring-1 focus:ring-primary outline-none transition-all h-24 resize-none"
                                                placeholder='[{"text": "Saiba Mais", "url": "..."}]'
                                                value={formData.cta_config}
                                                onChange={e => setFormData({ ...formData, cta_config: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Estrutura Sugerida (Blueprint JSON)</label>
                                            <textarea
                                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-mono focus:ring-1 focus:ring-primary outline-none transition-all h-32 resize-none"
                                                placeholder='["Introdução", "Visão Geral", "Recursos", "Veredito"]'
                                                value={formData.structure_blueprint}
                                                onChange={e => setFormData({ ...formData, structure_blueprint: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Word Count Alvo (Média)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                                value={formData.typical_word_count}
                                                onChange={e => setFormData({ ...formData, typical_word_count: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 rounded-2xl bg-primary hover:bg-blue-600 text-white text-xs font-black shadow-glow transition-all"
                                    >
                                        SALVAR ALTERAÇÕES
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Presets;
