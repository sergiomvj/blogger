
import React, { useState, useEffect } from 'react';
import { Screen, Job, LogEntry } from '../types';
import { api } from '../services/api';

interface JobDetailsProps {
  jobId: string;
  onNavigate: (screen: Screen) => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onNavigate }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [costEstimates, setCostEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobData = async () => {
    try {
      const [jobData, artifactData, costData] = await Promise.all([
        api.getJobById(jobId),
        api.getJobArtifacts(jobId),
        api.getJobCostEstimates(jobId)
      ]);
      setJob(jobData);
      setArtifacts(artifactData);
      setCostEstimates(costData.estimates || []);
    } catch (error) {
      console.error('Failed to fetch job details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
    const timer = setInterval(fetchJobData, 5000); // Poll every 5s if running
    return () => clearInterval(timer);
  }, [jobId]);

  if (loading && !job) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-dark p-4">
        <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">error</span>
        <h2 className="text-xl font-bold">Job não encontrado</h2>
        <button onClick={() => onNavigate(Screen.QUEUE)} className="mt-4 text-primary">Voltar para Fila</button>
      </div>
    );
  }

  const logs: LogEntry[] = artifacts.map(a => ({
    time: new Date(a.created_at).toLocaleTimeString(),
    level: 'Success',
    message: `Finalizado: ${a.task}`
  }));

  // Map progress to steps
  const steps = [
    { label: 'Briefing', key: 'T0', done: job.progress >= 10 },
    { label: 'Estrutura', key: 'T1', done: job.progress >= 20 },
    { label: 'SEO/Title', key: 'T4', done: job.progress >= 50 },
    { label: 'Escrita', key: 'T6', done: job.progress >= 80 },
    { label: 'Publicado', key: 'T10', done: job.status === 'published' || job.status === 'Published' }
  ];

  return (
    <div className="flex flex-col h-screen bg-background-dark">
      <header className="flex items-center bg-background-dark p-4 justify-between border-b border-slate-800 z-10">
        <button onClick={() => onNavigate(Screen.QUEUE)} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-base font-bold">Job #{jobId.substring(0, 8)}</h2>
          <span className="text-[10px] text-slate-400 capitalize">{job.status}</span>
        </div>
        <button className="size-10 flex items-center justify-center rounded-full hover:bg-slate-800">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32 p-4">
        {/* Status Card */}
        <div className={`flex flex-col gap-4 rounded-xl p-4 shadow-sm border mb-6 ${['failed', 'Failed'].includes(job.status) ? 'bg-rose-950/20 border-rose-900/50' : 'bg-surface-dark border-slate-800'
          }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-fit mb-1 ${['published', 'Published'].includes(job.status) ? 'bg-emerald-900/30 text-emerald-400' :
                ['failed', 'Failed'].includes(job.status) ? 'bg-rose-900/30 text-rose-400' : 'bg-blue-900/30 text-blue-300'
                }`}>{job.status}</span>
              <h3 className="text-lg font-bold truncate max-w-[250px]">{job.title || 'Gerando título...'}</h3>
              <p className="text-slate-400 text-sm">{job.site} • {job.category}</p>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-300">Progresso do Motor</span>
              <span className="text-xs text-primary font-bold">{job.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${['failed', 'Failed'].includes(job.status) ? 'bg-rose-500' : 'bg-primary animate-pulse'
                }`} style={{ width: `${job.progress}%` }}></div>
            </div>
          </div>

          {(job as any).last_error && (
            <div className="mt-2 p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Erro Detectado:</p>
              <p className="text-xs text-rose-200 font-mono">{(job as any).last_error}</p>
            </div>
          )}
        </div>

        {/* Steps Timeline */}
        <div className="mb-8 px-2">
          <div className="flex justify-between items-center w-full relative">
            <div className="absolute top-[15px] left-0 w-full h-0.5 bg-slate-800 -z-0 rounded"></div>
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-2 z-10 relative">
                <div className={`size-8 rounded-full flex items-center justify-center border-4 border-background-dark shadow-sm transition-colors ${step.done ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                  {step.done ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">circle</span>
                  )}
                </div>
                <span className={`text-[9px] bg-background-dark px-1 ${step.done ? 'font-bold text-primary' : 'font-medium text-slate-400 text-center'
                  }`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What-if Pricing Comparison */}
        {costEstimates.length > 0 && (
          <div className="mb-6 rounded-2xl bg-surface-dark border border-white/5 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">What-if Pricing Comparison</h4>
              <span className="text-[10px] text-slate-500 font-mono">Real-time simulation</span>
            </div>
            <div className="space-y-3">
              {costEstimates.map((est, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="size-8 flex items-center justify-center rounded-lg bg-black text-primary border border-white/10 group-hover:shadow-glow-xs transition-all">
                      <span className="material-symbols-outlined text-[18px]">query_stats</span>
                    </div>
                    <span className="text-xs font-bold text-slate-300">{est.display_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">${est.estimated_cost}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Estimated</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500 text-[18px]">info</span>
              <p className="text-[10px] text-slate-500 leading-tight italic">
                Values calculated based on <b>{((costEstimates[0]?.tokens?.input + costEstimates[0]?.tokens?.output) / 1000).toFixed(1)}K</b> total tokens used in this job.
              </p>
            </div>
          </div>
        )}

        {/* Logs Section */}
        <div className="rounded-xl bg-black border border-slate-800 overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico de Artefatos</h4>
            <div className="flex items-center gap-1">
              <div className={`size-2 rounded-full ${['published', 'Published'].includes(job.status) ? 'bg-emerald-500' : 'bg-primary animate-pulse'}`}></div>
              <span className={`text-[10px] font-medium ${['published', 'Published'].includes(job.status) ? 'text-emerald-500' : 'text-primary'}`}>
                {job.status}
              </span>
            </div>
          </div>
          <div className="p-3 font-mono text-[10px] space-y-2 max-h-[300px] overflow-y-auto">
            {logs.length === 0 && <p className="text-slate-600 italic">Nenhum artefato gerado ainda...</p>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 text-slate-500 border-b border-white/5 pb-2">
                <span className="shrink-0 text-slate-600">[{log.time}]</span>
                <span className="text-emerald-400">DOC:</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
            {['processing', 'Running', 'Queued'].includes(job.status) && (
              <div className="flex gap-2 text-slate-500 animate-pulse">
                <span className="shrink-0 text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-blue-400">AGUARDANDO:</span>
                <span className="text-white">Motor processando próxima etapa...</span>
              </div>
            )}
          </div>
        </div>

        {artifacts.find(a => a.task === 'article_body') && (
          <div className="mt-6 rounded-2xl bg-surface-dark border border-white/5 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Preview: Conteúdo do Artigo</h4>
              <span className="text-[10px] text-primary font-bold">{artifacts.find(a => a.task === 'article_body').json_data.word_count || ''} palavras</span>
            </div>
            <div className="p-8 text-slate-300 prose prose-invert prose-lg max-w-none 
                prose-headings:text-white prose-p:leading-8 prose-p:mb-6 
                prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:font-black prose-h2:text-primary-light
                prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:font-bold
                prose-img:rounded-3xl prose-img:shadow-2xl prose-img:border prose-img:border-white/10 prose-img:my-10
                prose-li:text-slate-300 prose-ul:my-6
                bg-surface-darker rounded-b-2xl">
              {artifacts.find(a => a.task === 'images')?.json_data?.top?.url && (
                <img src={artifacts.find(a => a.task === 'images').json_data.top.url} alt="Top Hero" className="w-full h-80 object-cover rounded-3xl mb-8 shadow-xl border border-white/10" />
              )}
              <div dangerouslySetInnerHTML={{ __html: artifacts.find(a => a.task === 'article_body').json_data.content_html }}></div>
            </div>
          </div>
        )}

        {job.wp_post_url && (
          <div className="mt-6">
            <a
              href={job.wp_post_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold hover:bg-emerald-500/20 transition-all"
            >
              <span className="material-symbols-outlined">description</span>
              Ver Artigo no Site
            </a>
          </div>
        )}

        {/* Download Center */}
        {artifacts.some(a => a.task === 'article_body') && (
          <div className="mt-8 rounded-2xl bg-surface-dark border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Download Center</h4>
              <span className="material-symbols-outlined text-primary text-[20px]">download</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  const art = artifacts.find(a => a.task === 'article_body');
                  const blob = new Blob([art.json_data.content_html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `article-${jobId.substring(0, 8)}.html`;
                  a.click();
                }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-orange-400">html</span>
                  <span className="text-xs font-bold text-slate-300">Exportar HTML</span>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-[18px]">chevron_right</span>
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(artifacts, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `artifacts-raw-${jobId.substring(0, 8)}.json`;
                  a.click();
                }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">code_blocks</span>
                  <span className="text-xs font-bold text-slate-300">Exportar JSON (Full)</span>
                </div>
                <span className="material-symbols-outlined text-slate-600 text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-8 lg:max-w-4xl mx-auto z-40">
        <div className="flex gap-3">
          <button onClick={fetchJobData} className="flex-1 h-12 rounded-lg bg-surface-dark border border-slate-700 text-white font-semibold shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Atualizar
          </button>
          {['failed', 'Failed'].includes(job.status) && (
            <button
              onClick={async () => {
                await api.retryJob(job.id);
                fetchJobData();
              }}
              className="flex-[2] h-12 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-blue-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              Reiniciar Job
            </button>
          )}
        </div>
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default JobDetails;
