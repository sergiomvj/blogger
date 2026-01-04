import React, { useEffect, useState } from 'react';
import { Screen, Job } from '../types';
import { api } from '../services/api';

interface JobQueueProps {
  onNavigate: (screen: Screen, id?: string) => void;
}

const JobQueue: React.FC<JobQueueProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([
    { id: '1', title: 'Carregando Dados...', site: 'System', category: 'Status', status: 'Running', progress: 0, icon: 'autorenew', timestamp: 'Agora' },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const data = await api.getJobs();
      if (data) {
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const stats = [
    { label: 'Em Execução', value: jobs.filter(j => ['running', 'processing', 'Running', 'Processing'].includes(j.status)).length.toString(), color: 'bg-primary/10 text-primary border-primary/20', icon: 'sync' },
    { label: 'Falhas', value: jobs.filter(j => ['failed', 'Failed'].includes(j.status)).length.toString(), color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: 'error' },
    { label: 'Revisão', value: jobs.filter(j => ['review', 'Needs Review'].includes(j.status)).length.toString(), color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'assignment_late' },
    { label: 'Concluídos', value: jobs.filter(j => ['published', 'Published'].includes(j.status)).length.toString(), color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: 'check_circle' },
  ];

  return (
    <div className="flex flex-col flex-1 bg-background-dark">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={fetchJobs} className="size-10 flex items-center justify-center rounded-full text-white hover:bg-white/10">
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Job Queue</h1>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 font-mono">v1.0.3</span>
          </div>
          <button className="size-10 flex items-center justify-center rounded-full text-white hover:bg-white/10">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <span className="material-symbols-outlined text-slate-400">search</span>
          </div>
          <input
            className="block w-full rounded-xl border-none bg-surface-dark py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-primary shadow-inner"
            placeholder="Search jobs..."
            type="text"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className={`flex flex-col justify-between gap-1 rounded-xl p-3 border shadow-sm ${stat.color} h-24`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{stat.label}</p>
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ativos e Erros</h2>
            <button className="text-xs font-medium text-primary">Ver Tudo</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {jobs.filter(j => ['running', 'processing', 'failed', 'Running', 'Failed', 'Needs Review'].includes(j.status)).map(job => (
              <div
                key={job.id}
                onClick={() => onNavigate(Screen.JOB_DETAILS, job.id)}
                className="relative flex flex-col gap-3 rounded-xl bg-surface-dark p-3 shadow-sm ring-1 ring-white/5 transition-all hover:bg-surface-darker cursor-pointer h-full min-w-0"
              >
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center justify-between min-w-0">
                    <div className={`size-8 shrink-0 flex items-center justify-center rounded-lg ${['running', 'processing', 'Running', 'Processing'].includes(job.status) ? 'bg-primary/20 text-primary' :
                      ['failed', 'Failed'].includes(job.status) ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{job.icon || 'article'}</span>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tighter ${['running', 'processing', 'Running', 'Processing'].includes(job.status) ? 'bg-primary/10 text-primary' :
                      ['failed', 'Failed'].includes(job.status) ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold truncate text-white leading-tight">{job.title || 'Sem Título'}</h3>
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-500">
                      <span className="truncate max-w-[50%]">{job.site || 'N/A'}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-slate-700 shrink-0"></span>
                      <span className="truncate">{job.category || 'Geral'}</span>
                    </div>
                  </div>
                </div>
                {['running', 'processing', 'Running', 'Processing'].includes(job.status) && (
                  <div className="mt-auto flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress || 0}%` }}></div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{job.progress || 0}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 pb-20">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Histórico Recente</h2>
          <div className="grid grid-cols-2 gap-3">
            {jobs.filter(j => ['published', 'queued', 'Published', 'Queued'].includes(j.status)).map(job => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-xl bg-surface-dark p-3 ring-1 ring-white/5 opacity-80 h-full"
                onClick={() => onNavigate(Screen.JOB_DETAILS, job.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="size-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">{job.icon || 'check_circle'}</span>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${['published', 'Published'].includes(job.status) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                    {job.status}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold truncate text-white">{job.title || 'Sem Título'}</h3>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{job.site || 'N/A'} • {job.category || 'Geral'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <button onClick={() => onNavigate(Screen.UPLOAD)} className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/30 active:scale-90 transition-all">
        <span className="material-symbols-outlined text-white text-[28px]">add</span>
      </button>
    </div>
  );
};

export default JobQueue;
