
import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

interface CostOverviewProps {
  onNavigate: (screen: Screen) => void;
}

const CostOverview: React.FC<CostOverviewProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<any>({ total_cost_usd: 0, total_articles: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, hist, det] = await Promise.all([
          api.getStatsSummary(),
          api.getStatsHistory(),
          api.getStatsDetails()
        ]);
        setSummary(sum);
        setHistory(hist);
        setDetails(det);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background-dark items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-dark overflow-hidden">
      <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-sm p-4 justify-between border-b border-white/5">
        <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 shrink-0">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-xl font-bold flex-1 text-center pr-10 text-white">Cost Overview</h2>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-4 py-4">
          <div className="flex h-10 w-full items-center justify-center rounded-lg bg-surface-dark p-1">
            {['7D', '30D', '3M', '1Y'].map((filter) => (
              <button
                key={filter}
                className={`flex-1 h-full rounded text-[10px] font-bold transition-all ${filter === '30D' ? 'bg-primary text-white shadow-glow' : 'text-slate-500 hover:text-white'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex flex-col gap-1 rounded-3xl p-6 bg-surface-dark shadow-xl border border-white/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Spend</p>
                <h3 className="text-4xl font-black tracking-tight text-white">
                  ${parseFloat(summary.total_cost_usd || 0).toFixed(2)}
                </h3>
              </div>
              <div className="size-12 flex items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-glow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>payments</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20">
                <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                {summary.total_articles} Articles
              </div>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-tighter">Total Generated</p>
            </div>
          </div>
        </div>

        {/* Visual Chart Integration */}
        <div className="px-4 py-2">
          <div className="flex flex-col gap-4 rounded-3xl p-6 bg-surface-dark shadow-xl border border-white/5 h-80">
            <div className="flex justify-between items-center mb-2">
              <p className="text-white text-sm font-bold">Spending Trend</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-primary shadow-glow-xs"></div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">LLM</span>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={history}
                    margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorLlm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#135bec" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#135bec" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2430" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="llm"
                      stackId="1"
                      stroke="#135bec"
                      fillOpacity={1}
                      fill="url(#colorLlm)"
                      strokeWidth={3}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
                  No historical data available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 mt-2">
          <div className="flex flex-col gap-4 rounded-3xl p-6 bg-surface-dark shadow-xl border border-white/5">
            <div className="flex justify-between items-center">
              <p className="text-white text-sm font-bold">Cost Distribution</p>
              <button className="text-primary text-[10px] font-bold uppercase tracking-widest">Detail View</button>
            </div>
            <div className="flex h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-primary shadow-glow-xs" style={{ width: '100%' }}></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">LLM (Tokens)</span>
                </div>
                <p className="text-sm font-black text-white ml-4">${parseFloat(summary.total_cost_usd || 0).toFixed(4)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col px-4">
          <h3 className="text-white text-xs font-bold uppercase tracking-widest py-6 px-2">Detailed Token Usage</h3>
          <div className="flex flex-col gap-4">
            {details.length > 0 ? details.map((item, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-3xl bg-surface-dark p-5 border border-white/5 shadow-xl transition-all hover:border-primary/30 group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="size-12 flex items-center justify-center rounded-2xl bg-white/5 text-primary border border-white/10 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>psychology</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-black truncate max-w-[150px]">{item.label}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">{item.provider}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-black">${parseFloat(item.cost || 0).toFixed(4)}</p>
                    <p className="text-emerald-500 text-[9px] font-mono leading-none mt-1">SUCCESS</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5 flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-[16px]">toll</span>
                    <span className="text-[11px] font-bold">{(item.unit_count / 1000).toFixed(1)}K Tokens</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-bold bg-black/30 px-2 py-1 rounded-md uppercase tracking-widest">Active Model</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-500 italic text-sm">
                No detailed usage data yet.
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 w-full max-w-md mx-auto p-4 bg-background-dark/80 backdrop-blur-md border-t border-white/5 z-50">
        <button className="w-full flex items-center justify-center gap-3 rounded-2xl h-14 bg-primary text-white font-black text-sm shadow-glow hover:brightness-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[20px]">notifications_active</span>
          Set Budget Alert
        </button>
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default CostOverview;
