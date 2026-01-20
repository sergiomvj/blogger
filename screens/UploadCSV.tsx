import React, { useState } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface UploadCSVProps {
  onNavigate: (screen: Screen, id?: string) => void;
}

const UploadCSV: React.FC<UploadCSVProps> = ({ onNavigate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('csv', file);

    try {
      const response = await api.uploadCSV(formData);
      console.log('Upload success:', response);
      onNavigate(Screen.QUEUE);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload CSV. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreArticlesBatch = async () => {
    setIsUploading(true);
    try {
      const response = await api.startBatchFromPreArticles();
      console.log('Pre-articles batch success:', response);
      onNavigate(Screen.QUEUE);
    } catch (error: any) {
      console.error('Batch creation failed:', error);
      alert(error.error || 'Falha ao criar lote de pré-artigos. Verifique se existem itens pendentes.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "blog,category,article_style,objective,theme,word_count,language,tags,tone,cta,featured_image_url,top_image_url,featured_image_alt,top_image_alt,sources";
    const example = "pnpmagazine,Fitness,analitico,Gerar leads para consultoria,Treino HIIT para iniciantes,1000,pt,\"hiit;emagrecimento;cardio\",\"moderno;direto\",\"Agende uma avaliação\",,,,";
    const csvContent = `${headers}\n${example}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "autowriter_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-white/5">
        <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-white">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10 text-white">Start New Batch</h1>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex w-full items-center justify-center gap-2 py-6">
          <div className="h-1.5 w-6 rounded-full bg-primary shadow-glow"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-white/10"></div>
        </div>

        <div className="px-6 pb-2">
          <h2 className="text-2xl font-bold pb-2 text-white italic tracking-tight">Generate All Pending</h2>
          <p className="text-slate-400 text-sm font-normal leading-relaxed">
            Process all unmanaged articles from your pre-article reviews or upload a new metadata file.
          </p>
        </div>

        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handlePreArticlesBatch}
            disabled={isUploading}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-primary/20 to-violet-600/10 p-8 transition-all hover:bg-primary/20 group active:scale-[0.98]"
          >
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>auto_awesome</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white italic">PRE-ARTICLES</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Generate From Reviews</p>
            </div>
          </button>

          <label className="group relative flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/10 cursor-pointer active:scale-[0.98]">
            <input accept=".csv" className="hidden" type="file" onChange={handleFileChange} />
            <div className={`size-16 rounded-2xl flex items-center justify-center transition-all ${file ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'}`}>
              <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>{file ? 'check_circle' : 'upload_file'}</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white italic truncate max-w-[150px]">{file ? file.name : 'CSV UPLOAD'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Import External Data</p>
            </div>
          </label>
        </div>

        <div className="px-6 pb-40">
          <div className="rounded-2xl bg-surface-dark border border-white/5 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary/80">CSV Specification</h3>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                GET TEMPLATE
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter mb-3">Required Columns</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { col: 'blog', desc: 'Site identifier (e.g. pnpmagazine).' },
                    { col: 'category', desc: 'WP category name.' },
                    { col: 'article_style', desc: 'Format (e.g. tutorial, news, list).' },
                    { col: 'objective', desc: 'Guideline for AI generation in PT.' },
                    { col: 'theme', desc: 'Central theme or keyword in PT.' },
                    { col: 'word_count', desc: 'Length: 500, 1000, 2000.' },
                    { col: 'language', desc: 'ISO code: pt, en, es.' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: '18px' }}>check_circle</span>
                      <div>
                        <p className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-block mb-1">{item.col}</p>
                        <p className="text-[11px] text-slate-400 leading-tight">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter mb-3">Optional Columns</p>
                <div className="grid grid-cols-2 gap-2">
                  {['tags', 'tone', 'cta', 'featured_image_url', 'top_image_url', 'sources'].map((col) => (
                    <div key={col} className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                      <p className="font-mono text-[10px] text-slate-400">{col}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-xl bg-primary/10 p-4 border border-primary/20">
              <span className="material-symbols-outlined text-primary shrink-0 text-[20px]">info</span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                Input (objective/theme) should be in **Portuguese**. AI will output in the selected **language**.
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 z-40 max-w-md mx-auto">
        <button
          disabled={!file || isUploading}
          onClick={handleSubmit}
          className={`w-full rounded-xl font-bold py-3.5 text-base flex items-center justify-center gap-2 transition-all ${file ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-blue-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
        >
          {isUploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          <span>Generate Articles</span>
        </button>
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default UploadCSV;
