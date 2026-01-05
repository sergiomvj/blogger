import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { api } from '../services/api';

interface SettingsProps {
  onNavigate: (screen: Screen) => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showStability, setShowStability] = useState(false);

  const [settings, setSettings] = useState({
    openai_api_key: 'sk-8j9sfd89sfd789...',
    anthropic_api_key: '',
    stability_api_key: 'sk-stability-key-123',
    image_mode: 'dalle3',
    base_prompt: '',
    use_llm_strategy: true,
    provider_openai_enabled: true,
    provider_anthropic_enabled: true,
    provider_google_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        if (data && Object.keys(data).length > 0) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };


  return (
    <div className="flex flex-col h-screen bg-background-dark pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background-dark sticky top-0 z-[110] backdrop-blur-md">
        <button onClick={() => onNavigate(Screen.DASHBOARD)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 shrink-0">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="text-base font-bold flex-1 text-center">Configurações</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
          ) : (
            <span className="material-symbols-outlined text-[18px]">save</span>
          )}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <section className="px-4 pt-6">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Text Generation</h3>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2 text-slate-200">OpenAI API Key</label>
            <div className="relative flex items-center bg-surface-dark rounded-xl border border-white/10 focus-within:border-primary transition-all shadow-sm">
              <span className="material-symbols-outlined absolute left-3 text-slate-500" style={{ fontSize: '20px' }}>key</span>
              <input
                className="w-full bg-transparent border-none text-white placeholder-slate-500 text-sm py-3.5 pl-10 pr-20 focus:ring-0"
                placeholder="sk-..."
                type={showOpenAI ? 'text' : 'password'}
                value={settings.openai_api_key}
                onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
              />
              <div className="absolute right-2 flex items-center space-x-1">
                <button className="p-1.5 text-slate-500 hover:text-primary"><span className="material-symbols-outlined text-[20px]">content_paste</span></button>
                <button onClick={() => setShowOpenAI(!showOpenAI)} className="p-1.5 text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined text-[20px]">{showOpenAI ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2 text-slate-200">Anthropic API Key</label>
            <div className="relative flex items-center bg-surface-dark rounded-xl border border-white/10 focus-within:border-primary transition-all shadow-sm">
              <span className="material-symbols-outlined absolute left-3 text-slate-500" style={{ fontSize: '20px' }}>neurology</span>
              <input
                className="w-full bg-transparent border-none text-white placeholder-slate-500 text-sm py-3.5 pl-10 pr-20 focus:ring-0"
                placeholder="sk-ant-..."
                type={showAnthropic ? 'text' : 'password'}
                value={settings.anthropic_api_key}
                onChange={(e) => handleInputChange('anthropic_api_key', e.target.value)}
              />
              <div className="absolute right-2 flex items-center space-x-1">
                <button className="p-1.5 text-slate-500 hover:text-primary"><span className="material-symbols-outlined text-[20px]">content_paste</span></button>
                <button onClick={() => setShowAnthropic(!showAnthropic)} className="p-1.5 text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined text-[20px]">{showAnthropic ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>



        <div className="h-px bg-white/5 mx-4 my-2"></div>

        <section className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prompt Central</h3>
            <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">Master Instructions</span>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2 text-slate-200">Prompt Base do Sistema</label>
            <div className="relative bg-surface-dark rounded-xl border border-white/10 focus-within:border-primary transition-all shadow-sm overflow-hidden">
              <textarea
                className="w-full bg-transparent border-none text-white text-[13px] p-4 focus:ring-0 font-mono leading-relaxed"
                rows={12}
                placeholder="Insira aqui as instruções mestras para a IA..."
                value={settings.base_prompt}
                onChange={(e) => handleInputChange('base_prompt', e.target.value)}
              />
              <div className="px-4 py-2 bg-black/40 border-t border-white/5">
                <p className="text-[10px] text-slate-500">
                  <span className="font-bold text-slate-400 mr-2">Dica:</span>
                  Use os marcadores <code className="text-primary">{`{blog_style}`}</code>, <code className="text-primary">{`{article_style}`}</code> e <code className="text-primary">{`{language}`}</code> para injeção dinâmica.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-white/5 mx-4 my-2"></div>

        <section className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LLM Routing</h3>
            <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">Fallback Engine</span>
          </div>

          <div className="bg-surface-dark border border-white/5 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Usar LLM Strategy</span>
                <span className="text-[10px] text-slate-400">Tenta modelos alternativos se o principal falhar</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!settings.use_llm_strategy}
                  onChange={(e) => handleInputChange('use_llm_strategy', e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="h-px bg-white/5 my-4"></div>

            <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Provedores Habilitados</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'provider_openai_enabled', label: 'OpenAI (GPT-4o, etc)', icon: 'bolt' },
                { id: 'provider_anthropic_enabled', label: 'Anthropic (Claude)', icon: 'auto_awesome' },
                { id: 'provider_google_enabled', label: 'Google (Gemini)', icon: 'google' }
              ].map((prov) => (
                <div key={prov.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">{prov.icon}</span>
                    <span className="text-xs text-slate-300">{prov.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary focus:ring-offset-slate-900"
                    checked={!!(settings as any)[prov.id]}
                    onChange={(e) => handleInputChange(prov.id, e.target.checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-px bg-white/5 mx-4 my-2"></div>

        <section className="px-4 pt-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Media Settings</h3>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2 text-slate-200">Image Generation Mode</label>
            <div className="relative">
              <select
                value={settings.image_mode}
                onChange={(e) => handleInputChange('image_mode', e.target.value)}
                className="w-full appearance-none bg-surface-dark border border-white/10 text-white text-sm rounded-xl py-3.5 pl-4 pr-10 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              >
                <option value="dalle3">DALL-E 3 (OpenAI)</option>
                <option value="stable-diffusion">Stable Diffusion XL</option>
                <option value="midjourney">Midjourney (via API)</option>
                <option value="none">Disabled</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-2 text-slate-200">Stability AI Key</label>
            <div className="relative flex items-center bg-surface-dark rounded-xl border border-white/10 focus-within:border-primary transition-all shadow-sm">
              <span className="material-symbols-outlined absolute left-3 text-slate-500" style={{ fontSize: '20px' }}>image</span>
              <input
                className="w-full bg-transparent border-none text-white placeholder-slate-500 text-sm py-3.5 pl-10 pr-20 focus:ring-0"
                placeholder="sk-..."
                type={showStability ? 'text' : 'password'}
                value={settings.stability_api_key}
                onChange={(e) => handleInputChange('stability_api_key', e.target.value)}
              />
              <div className="absolute right-2 flex items-center space-x-1">
                <button className="p-1.5 text-slate-500 hover:text-primary"><span className="material-symbols-outlined text-[20px]">content_paste</span></button>
                <button onClick={() => setShowStability(!showStability)} className="p-1.5 text-slate-500 hover:text-white">
                  <span className="material-symbols-outlined text-[20px]">{showStability ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-white/5 mx-4 my-2"></div>

        <section className="px-4 pt-4 pb-12">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">SEO Integration</h3>
          <div className="space-y-3">
            {[
              { id: 'yoast', label: 'Yoast SEO', desc: 'Generate metadata', icon: 'search', color: 'bg-[#a4286a]', checked: true },
              { id: 'rankmath', label: 'RankMath', desc: 'Score optimization', icon: 'trending_up', color: 'bg-[#ff3d64]' },
              { id: 'aio', label: 'All in One SEO', desc: 'Schema markup', icon: 'language', color: 'bg-[#005ae0]' }
            ].map((seo) => (
              <div key={seo.id} className="flex items-center justify-between p-4 bg-surface-dark border border-white/5 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center size-10 rounded-lg ${seo.color} text-white`}>
                    <span className="material-symbols-outlined">{seo.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{seo.label}</span>
                    <span className="text-[10px] text-slate-400">{seo.desc}</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input defaultChecked={seo.checked} className="sr-only peer" type="checkbox" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
