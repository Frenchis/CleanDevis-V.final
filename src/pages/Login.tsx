import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { EyeCatchingButton_v2 } from '../components/ui/shiny-button';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const userEmail = data.user.email || '';
                if (userEmail.endsWith('@clean-concept.fr') || userEmail === 'jules.boullier@gmail.com' || userEmail === 'jules.boullier@audencia.com') {
                    navigate(from, { replace: true });
                } else {
                    await supabase.auth.signOut();
                    setError("Accès non autorisé. Veuillez utiliser une adresse @clean-concept.fr");
                }
            }
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de la connexion");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-green/20 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl rounded-3xl p-8">

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-brand-blue to-brand-green rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-brand-blue/20 mb-4">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">CleanDevis Portal</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Connexion réservée aux membres Clean Concept
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nom@clean-concept.fr"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <EyeCatchingButton_v2
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-brand-blue to-brand-green border-none text-white shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
                        </EyeCatchingButton_v2>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            Accès restreint • IP enregistrée
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
