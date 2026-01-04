import React, { useEffect, useState } from 'react';
import { Screen, Job } from '../types';
import { api } from '../services/api';

interface JobQueueProps {
  onNavigate: (screen: Screen, id?: string) => void;
}

const JobQueue: React.FC<JobQueueProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([
    { id: '4921', title: 'Top 10 SEO Strategies for 2024', site: 'MarketingPros', category: 'Guides', status: 'Running', progress: 45, timestamp: 'Now', icon: 'autorenew' },
    { id: '4922', title: 'How to fix 404 Errors', site: 'TechDaily', category: 'Tutorials', status: 'Failed', timestamp: '2m ago', icon: 'warning' },
    { id: '4923', title: 'Review of iPhone 15 Pro Max', site: 'TechDaily', category: 'Reviews', status: 'Needs Review', timestamp: '1h ago', icon: 'rate_review' },
    { id: '4924', title: "Beginner's Guide to React Hooks", site: 'DevWorld', category: 'Coding', status: 'Published', timestamp: 'Yesterday', icon: 'check' },
    { id: '4925', title: 'The Future of AI Writing', site: 'AI Insights', category: 'Opinion', status: 'Queued', timestamp: 'Today', icon: 'hourglass_empty' },
    { id: '4926', title: 'Best Vegan Recipes 2024', site: 'FoodieLife', category: 'Recipes', status: 'Published', timestamp: 'Yesterday', icon: 'check' },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const data = await api.getJobs();
      if (data && data.length > 0) {
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
    { label: 'Running', value: jobs.filter(j => j.status === 'Running' || j.status === 'Processing').length.toString(), color: 'bg-primary/10 text-primary border-primary/20', icon: 'sync' },
    { label: 'Failed', value: jobs.filter(j => j.status === 'Failed').length.toString(), color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: 'error' },
    { label: 'Review', value: jobs.filter(j => j.status === 'Needs Review').length.toString(), color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'assignment_late' },
    { label: 'Done', value: jobs.filter(j => j.status === 'Published').length.toString(), color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: 'check_circle' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background-dark pb-32">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={fetchJobs} className="size-10 flex items-center justify-center rounded-full text-white hover:bg-white/10">
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <h1 className="text-lg font-bold">Job Queue</h1>
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
            className="block w-full rounded-xl border-none bg-surface-dark py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-primary"
            placeholder="Search by keyword or status..."
            type="text"
          />
        </div>

        <div className="flex w-full gap-3 overflow-x-auto no-scrollbar pb-1">
          {stats.map((stat, i) => (
            <div key={i} className={`flex min-w-[120px] flex-1 flex-col justify-between gap-3 rounded-xl p-4 border ${stat.color}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
                <p className="text-xs font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Active & Issues</h2>
            <button className="text-xs font-medium text-primary">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {jobs.filter(j => ['Running', 'Failed', 'Needs Review'].includes(j.status)).map(job => (
              <div
                key={job.id}
                onClick={() => onNavigate(Screen.JOB_DETAILS, job.id)}
                className="flex flex-col gap-3 rounded-xl bg-surface-dark p-3 shadow-sm ring-1 ring-white/5 transition-all hover:bg-surface-darker cursor-pointer h-full"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className={`size-8 shrink-0 flex items-center justify-center rounded-lg ${job.status === 'Running' ? 'bg-primary/20 text-primary' :
                      job.status === 'Failed' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{job.icon}</span>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${job.status === 'Running' ? 'bg-primary/10 text-primary' :
                      job.status === 'Failed' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold truncate text-white">{job.title}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400">
                      <span className="truncate max-w-[60px]">{job.site}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-slate-600 shrink-0"></span>
                      <span className="truncate">{job.category}</span>
                    </div>
                  </div>
                </div>
                {job.status === 'Running' && (
                  <div className="mt-auto flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }}></div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{job.progress}%</span>
                  </div>
                )}
                {job.status === 'Failed' && (
                  <div className="mt-auto">
                    <button className="w-full flex items-center justify-center gap-1 rounded-lg bg-primary/20 p-1.5 text-[10px] font-bold text-primary">
                      <span className="material-symbols-outlined text-[14px]">replay</span>
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 pb-20">
          <h2 className="text-base font-bold">Recent History</h2>
          <div className="grid grid-cols-2 gap-3">
            {jobs.filter(j => ['Published', 'Queued'].includes(j.status)).map(job => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-xl bg-surface-dark p-3 ring-1 ring-white/5 opacity-80 h-full"
                onClick={() => onNavigate(Screen.JOB_DETAILS, job.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="size-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">{job.icon}</span>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${job.status === 'Published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                    {job.status}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold truncate text-white">{job.title}</h3>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{job.site} • {job.category}</p>
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
