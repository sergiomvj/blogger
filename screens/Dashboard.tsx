import React, { useEffect, useState } from 'react';
import { Screen, Stat, Job } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [blogsCount, setBlogsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsData, blogsData] = await Promise.all([
          api.getJobs(),
          api.getBlogs?.()
        ]);
        if (Array.isArray(jobsData)) setRecentJobs(jobsData);
        if (Array.isArray(blogsData)) {
          setBlogsCount(blogsData.length);
        } else {
          setBlogsCount(0);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats: Stat[] = [
    { label: 'Artigos Publicados', value: '1,240', trend: '+5%', icon: 'article', color: 'bg-primary/10 text-primary' },
    { label: 'Sites Conectados', value: blogsCount?.toString() || '0', icon: 'language', color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Fila de Espera', value: '0', icon: 'pending_actions', color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Taxa de Sucesso', value: '100%', icon: 'analytics', color: 'bg-violet-500/10 text-violet-500' },
  ];


  return (
    <div className="flex flex-col h-full bg-background-dark pb-32 overflow-y-auto no-scrollbar">
      <header className="sticky top-0 z-20 bg-background-dark/90 backdrop-blur-md px-4 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">edit_note</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-[0.2em] uppercase text-primary italic">BLOGGER</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase">Multisite Engine</p>
          </div>
        </div>
        <button onClick={() => onNavigate(Screen.SETTINGS)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="p-5">
        <section className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Good Morning, Admin.</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
            <p className="text-sm font-medium text-slate-400">All systems operational. Network active.</p>
          </div>
        </section>

        {blogsCount === 0 ? (
          <section className="mb-8 p-8 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-[2rem] border border-primary/20 relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 size-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
            <div className="relative z-10">
              <span className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">Onboarding Recomended</span>
              <h3 className="text-2xl font-black italic uppercase tracking-tight mt-4 max-w-xs">Sua Network de Blogs está Vazia</h3>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-sm">
                Para começar a publicar artigos com IA, você precisa conectar seu primeiro blog ou configurar um novo projeto.
              </p>
              <button
                onClick={() => onNavigate(Screen.BLOGS)}
                className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-glow hover:scale-105 transition-all active:scale-95 flex items-center gap-3 w-fit"
              >
                <span className="material-symbols-outlined">rocket_launch</span>
                Configurar Primeiro Blog
              </button>
            </div>
          </section>
        ) : (
          <section className="mb-8 p-6 bg-surface-dark/50 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">add_circle</span>
              </div>
              <div>
                <h4 className="font-black italic uppercase tracking-tight text-white">Expandir Network</h4>
                <p className="text-xs text-slate-500 font-medium">Já tem {blogsCount} sites ativos. Deseja adicionar mais um?</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate(Screen.BLOGS)}
              className="px-6 py-2.5 bg-white/5 hover:bg-primary text-white hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Novo Blog
            </button>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 mb-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              onClick={() => stat.label.includes('Sites') && onNavigate(Screen.BLOGS)}
              className={`bg-surface-dark rounded-xl p-4 shadow-sm border border-white/5 flex flex-col justify-between h-32 ${stat.label.includes('Sites') ? 'cursor-pointer hover:border-primary/50' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className={`p-2 rounded-lg ${stat.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
                </span>
                {stat.trend && (
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    {stat.trend}
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
                <p className="text-xs font-medium text-slate-400 mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onNavigate(Screen.NEW_ARTICLE)}
              className="flex items-center gap-4 bg-primary/10 border border-primary/20 p-4 rounded-xl hover:bg-primary/20 transition-colors text-left"
            >
              <div className="size-12 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">add_circle</span>
              </div>
              <div>
                <p className="font-bold text-primary">Iniciar um novo artigo</p>
                <p className="text-xs text-slate-400">Configure um artigo individual com SEO otimizado</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(Screen.PRE_ARTICLE_REVIEW)}
              className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl hover:bg-amber-500/20 transition-colors text-left"
            >
              <div className="size-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">rate_review</span>
              </div>
              <div>
                <p className="font-bold text-amber-500">Revisar pré-artigo</p>
                <p className="text-xs text-slate-400">Ajuste escolhas e finalize parâmetros de SEO</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(Screen.ARTICLES)}
              className="flex items-center gap-4 bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl hover:bg-violet-500/20 transition-colors text-left"
            >
              <div className="size-12 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">article</span>
              </div>
              <div>
                <p className="font-bold text-violet-500">Meus Artigos</p>
                <p className="text-xs text-slate-400">Veja todos os artigos publicados e filtre por blog</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(Screen.SEO)}
              className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl hover:bg-emerald-500/20 transition-colors text-left"
            >
              <div className="size-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">search_insights</span>
              </div>
              <div>
                <p className="font-bold text-emerald-500">SEO Intelligence</p>
                <p className="text-xs text-slate-400">Análise semântica e planejamento de keywords estratégico</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate(Screen.INTEGRATOR)}
              className="flex items-center gap-4 bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl hover:bg-sky-500/20 transition-colors text-left"
            >
              <div className="size-12 rounded-full bg-sky-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">hub</span>
              </div>
              <div>
                <p className="font-bold text-sky-500">Integrador Hub</p>
                <p className="text-xs text-slate-400">Gerencie conexões de blogs e auditoria universal da API</p>
              </div>
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <button onClick={() => onNavigate(Screen.QUEUE)} className="text-xs font-semibold text-primary">View All</button>
          </div>
          <div className="flex flex-col gap-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onNavigate(Screen.QUEUE)}
                className="bg-surface-dark rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors cursor-pointer relative overflow-hidden group"
              >
                {job.status === 'Processing' && job.progress !== undefined && (
                  <div className="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${job.status === 'Published' ? 'bg-emerald-500/10 text-emerald-500' :
                    job.status === 'Failed' ? 'bg-rose-500/10 text-rose-500' :
                      job.status === 'Processing' ? 'bg-primary/10 text-primary' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                    <span className="material-symbols-outlined">{job.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate">{job.title}</p>
                      <span className="text-[10px] text-slate-500">{job.timestamp}</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${job.status === 'Published' ? 'text-emerald-400' :
                      job.status === 'Failed' ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                      {job.status === 'Processing' ? `Batch #${job.id} • ${job.progress}% Complete` :
                        job.status === 'Queued' ? `Scheduled for 2:00 PM` :
                          job.status === 'Failed' ? 'Connection timeout' : 'Completed successfully'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-500 text-[20px]">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 left-0 right-0 p-5 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-12 max-w-md mx-auto z-40 pointer-events-none">
        <button
          onClick={() => onNavigate(Screen.UPLOAD)}
          className="w-full h-14 bg-primary hover:bg-blue-600 active:scale-[0.98] transition-all rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-3 group pointer-events-auto"
        >
          <span className="material-symbols-outlined text-white group-hover:rotate-90 transition-transform">add</span>
          <span className="text-white font-bold text-lg">Start New Batch</span>
        </button>
      </div>
    </div >
  );
};

export default Dashboard;
