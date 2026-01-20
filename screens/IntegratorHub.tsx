import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface IntegratorHubProps {
    onNavigate: (screen: Screen) => void;
}

const IntegratorHub: React.FC<IntegratorHubProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState('blogs');
    const [tenants, setTenants] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tenantsData, eventsData] = await Promise.all([
                api.getTenants(),
                api.getIntegrationEvents()
            ]);
            setTenants(Array.isArray(tenantsData) ? tenantsData : []);
            setEvents(Array.isArray(eventsData) ? eventsData : []);
        } catch (err) {
            console.error('Failed to fetch integrator data:', err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'blogs', label: 'Blogs Conectados', icon: 'dvr' },
        { id: 'history', label: 'Histórico de Pubs', icon: 'history' },
        { id: 'media', label: 'Sincronização Mídia', icon: 'sync' },
        { id: 'audit', label: 'Auditoria (DLQ)', icon: 'rule' },
        { id: 'settings', label: 'Configurações API', icon: 'api' },
    ];

    const renderEvents = () => {
        if (events.length === 0) {
            return (
                <div className="p-12 text-center">
                    <span className="material-symbols-outlined text-slate-700 text-[64px] mb-4">history</span>
                    <p className="text-slate-500 font-medium">Nenhum evento de integração registrado.</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Evento</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Recurso</th>
                            <th className="px-6 py-4">Data</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {events.map((ev) => (
                            <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-xs font-bold text-white uppercase">{ev.action}</p>
                                    <p className="text-[10px] text-slate-500 font-mono truncate max-w-[100px]">{ev.idempotency_key}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${ev.status === 'processed' ? 'bg-emerald-500/10 text-emerald-500' :
                                        ev.status === 'failed' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'
                                        }`}>
                                        {ev.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-xs text-slate-300 font-medium">{ev.resource_type}</p>
                                </td>
                                <td className="px-6 py-4 text-[10px] text-slate-500">
                                    {new Date(ev.created_at).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-background-dark text-white">
            {/* Top Header & Sub-menu */}
            <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-8 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black italic tracking-tight uppercase">Integrador Hub</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Universal Publishing API</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>sync</span>
                            Refresh
                        </button>
                        <button
                            onClick={() => onNavigate(Screen.BLOGS)}
                            className="px-4 py-2 bg-primary rounded-xl text-sm font-bold shadow-glow hover:bg-blue-600 transition-all active:scale-95"
                        >
                            Conectar Novo Blog
                        </button>
                    </div>
                </div>

                {/* Sub-menu Navigation */}
                <nav className="px-8 flex gap-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                                {tab.label}
                            </div>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-glow"></div>
                            )}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-surface-dark rounded-3xl border border-white/5 p-8">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">monitoring</span>
                                    Status Geral do Integrador
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Tenants Ativos', val: tenants.length, color: 'text-emerald-500' },
                                        { label: 'Eventos', val: events.length, color: 'text-primary' },
                                        { label: 'Falhas/DLQ', val: events.filter(e => e.status === 'failed').length, color: 'text-rose-500' },
                                        { label: 'Uptime', val: '100%', color: 'text-violet-400' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                                            <p className={`text-xl font-black mt-1 ${s.color}`}>{s.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-surface-dark rounded-3xl border border-white/5 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="font-bold uppercase tracking-tight italic text-sm text-primary">
                                        {tabs.find(t => t.id === activeTab)?.label}
                                    </h3>
                                    <button className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Ver tudo</button>
                                </div>

                                {activeTab === 'blogs' && (
                                    <div className="p-8">
                                        {tenants.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {tenants.map(t => (
                                                    <div key={t.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-primary/40 transition-all cursor-pointer group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                                <span className="material-symbols-outlined">dns</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black italic uppercase text-white">{t.name}</h4>
                                                                <p className="text-[10px] text-slate-500 font-bold">API v1.2 Ready</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center">
                                                <span className="material-symbols-outlined text-slate-700 text-[64px] mb-4">dvr</span>
                                                <p className="text-slate-500 font-medium">Nenhum blog tenant conectado.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'history' && renderEvents()}
                                {activeTab === 'audit' && renderEvents()}

                                {['media', 'settings'].includes(activeTab) && (
                                    <div className="p-12 text-center">
                                        <span className="material-symbols-outlined text-slate-700 text-[64px] mb-4">
                                            {tabs.find(t => t.id === activeTab)?.icon}
                                        </span>
                                        <p className="text-slate-500 font-medium italic">Configurações para este módulo serão liberadas na v1.1</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-3xl border border-white/5 p-6 hover:border-primary/30 transition-all group">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] text-primary">code_blocks</span>
                                    Blog Starter Kit
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                    Precisa de uma estrutura de blog rápida e compatível? Use nosso boiler plate oficial.
                                </p>
                                <button className="w-full py-3 bg-white/5 group-hover:bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Acessar Boilerplate
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-primary/10 to-violet-600/10 rounded-3xl border border-primary/20 p-6">
                                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                                    Security Layer
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Todas as comunicações usam assinaturas HMAC e Idempotency-Keys para garantir que nenhum artigo seja duplicado ou fraudado.
                                </p>
                                <div className="mt-4 pt-4 border-t border-primary/10">
                                    <button className="text-[10px] font-black text-white bg-primary/20 px-3 py-1 uppercase tracking-widest rounded">
                                        Active Guard: ON
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IntegratorHub;
