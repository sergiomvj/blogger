import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
    currentScreen: Screen;
    onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
    const navItems = [
        { id: Screen.DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
        { id: Screen.QUEUE, label: 'Fila de Jobs', icon: 'layers' },
        { id: Screen.BLOGS, label: 'Gerenciar Sites', icon: 'language' },
        { id: Screen.PRE_ARTICLE_REVIEW, label: 'Planejamento', icon: 'event_note' },
        { id: Screen.ARTICLES, label: 'Artigos', icon: 'description' },
        { id: Screen.MEDIA, label: 'Biblioteca de Mídia', icon: 'image' },
        { id: Screen.COSTS, label: 'Análise de Custos', icon: 'payments' },
        { id: Screen.PRESETS, label: 'Linhas Editoriais', icon: 'palette' },
        { id: Screen.SEO, label: 'SEO Intelligence', icon: 'search_insights' },
        { id: Screen.INTEGRATOR, label: 'Integrador Hub', icon: 'hub' },
        { id: Screen.SETTINGS, label: 'Configurações', icon: 'settings' },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-72 bg-surface-dark border-r border-white/5 h-screen sticky top-0 shrink-0">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-10">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-white">edit_note</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white italic">BLOGGER</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enterprise Hub</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${currentScreen === item.id
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[22px] transition-transform duration-200 group-hover:scale-110 ${currentScreen === item.id ? 'filled font-variation-fill-1' : ''
                                }`}>
                                {item.icon}
                            </span>
                            <span className="text-sm font-bold">{item.label}</span>
                            {currentScreen === item.id && (
                                <div className="ml-auto size-1.5 rounded-full bg-primary shadow-glow-xs"></div>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-8">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-white/5">
                    <p className="text-xs font-bold text-white mb-1">Backup do Sistema</p>
                    <p className="text-[10px] text-slate-500 mb-3">Sincronizado com Supabase</p>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[92%]"></div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
