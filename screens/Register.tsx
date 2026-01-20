import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Screen } from '../types';

interface RegisterProps {
    onNavigate: (screen: Screen) => void;
    onRegisterSuccess: () => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate, onRegisterSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                onNavigate(Screen.LOGIN);
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar cadastro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background-dark relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/20 mb-4 transform hover:scale-105 transition-transform duration-500">
                        <span className="material-symbols-outlined text-white text-3xl">edit_note</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 italic">BLOGGER</h1>
                    <p className="text-slate-400 font-medium tracking-[0.3em] uppercase text-[10px]">Crie sua conta</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="size-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-emerald-500 text-4xl">check_circle</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Cadastro Realizado!</h2>
                            <p className="text-slate-400 text-sm">
                                Verifique seu e-mail para confirmar a conta. Redirecionando para o login...
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="text-xl font-bold text-white mb-1">Novo Cadastro</h2>
                                <p className="text-sm text-slate-400">Preencha os dados abaixo para começar.</p>
                            </div>

                            <form onSubmit={handleRegister} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                                        E-mail Profissional
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
                                        <input
                                            type="email"
                                            required
                                            placeholder="seu@email.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-600"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                                        Senha
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                                        <input
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-600"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
                                        Confirmar Senha
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">shield</span>
                                        <input
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-600"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
                                        <span className="material-symbols-outlined text-rose-500 text-[20px]">error</span>
                                        <p className="text-xs text-rose-400 leading-tight">{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full h-14 bg-primary hover:bg-blue-600 active:scale-[0.98] transition-all rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:pointer-events-none mt-4`}
                                >
                                    {loading ? (
                                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="text-white font-bold text-lg">Criar Conta</span>
                                            <span className="material-symbols-outlined text-white transition-transform group-hover:translate-x-1">person_add</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            <footer className="mt-8 text-center pt-6 border-t border-white/5">
                                <p className="text-xs text-slate-400">
                                    Já tem uma conta? <button onClick={() => onNavigate(Screen.LOGIN)} className="font-bold text-primary hover:text-blue-400 underline decoration-primary/30 underline-offset-4">Fazer Login</button>
                                </p>
                            </footer>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;
