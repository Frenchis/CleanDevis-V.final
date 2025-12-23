
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Settings as SettingsIcon, Users, LayoutTemplate, Coins, CloudLightning, Link as LinkIcon } from 'lucide-react';
import { GlobalConfig, TypologyPerformance, Phase } from '../types';
import { DEFAULT_CONFIG, getConfig } from '../services/calculationService';
import { checkConnection } from '../services/sellsyService';
import { Input } from '../components/Input';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmModal';

import { supabase } from '../lib/supabaseClient';
import { isUserAdmin } from '../lib/constants';

export const Settings = () => {
    const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [apiMessage, setApiMessage] = useState('');

    const [isAdmin, setIsAdmin] = useState(false);
    const toast = useToast();
    const confirm = useConfirm();

    // Load from Supabase (and fallback to local) on mount
    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);

            // Check Admin Status
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email && isUserAdmin(session.user.email)) {
                setIsAdmin(true);
            }

            try {
                // 1. Try fetching from Supabase
                const { data, error } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'global_config')
                    .single();

                if (data && data.value) {
                    console.log("Loaded config from Supabase");
                    // Merge with default config to ensure structure exists (e.g. if remote is empty {})
                    const mergedConfig = { ...DEFAULT_CONFIG, ...data.value };
                    setConfig(mergedConfig);
                    // Sync to local for other synchronous parts of the app
                    localStorage.setItem('cleanDevis_config', JSON.stringify(mergedConfig));
                } else {
                    // 2. Fallback to local storage if no remote config
                    console.log("No remote config, using local");
                    setConfig(getConfig());
                }
            } catch (err) {
                console.error("Error loading settings:", err);
                setConfig(getConfig());
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Auto-check connection when config is loaded and clientId exists
    useEffect(() => {
        if (config.sellsy?.clientId && apiStatus === 'idle') {
            handleTestConnection();
        }
    }, [config.sellsy?.clientId]);

    const handleChange = (key: string, value: number, section?: 'productivity') => {
        setConfig(prev => {
            if (section === 'productivity') {
                return { ...prev, productivity: { ...prev.productivity, [key]: value } };
            }
            return { ...prev, [key]: value };
        });
        setIsSaved(false);
    };

    const handleTypologyYieldChange = (key: keyof TypologyPerformance, value: number) => {
        setConfig(prev => ({
            ...prev,
            productivity: {
                ...prev.productivity,
                typologies: {
                    ...prev.productivity.typologies,
                    [key]: value
                }
            }
        }));
        setIsSaved(false);
    };

    const handleSellsyChange = (key: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            sellsy: {
                clientId: prev.sellsy?.clientId || '',
                productMapping: prev.sellsy?.productMapping || {},
                ...prev.sellsy,
                [key]: value
            }
        }));
        setIsSaved(false);
    };

    const handleThresholdChange = (key: 'green' | 'orange', value: number) => {
        setConfig(prev => ({
            ...prev,
            matrixThresholds: {
                green: prev.matrixThresholds?.green ?? 5,
                orange: prev.matrixThresholds?.orange ?? 10,
                [key]: value
            }
        }));
        setIsSaved(false);
    };

    const handleProductMappingChange = (phase: string, code: string) => {
        setConfig(prev => ({
            ...prev,
            sellsy: {
                clientId: prev.sellsy?.clientId || '',
                productMapping: {
                    ...prev.sellsy?.productMapping,
                    [phase]: code
                }
            }
        }));
        setIsSaved(false);
    };

    const saveConfig = async () => {
        // 1. Save to LocalStorage (immediate sync for app)
        localStorage.setItem('cleanDevis_config', JSON.stringify(config));

        // 2. Save to Supabase
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'global_config',
                    value: config,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            setIsSaved(true);
            toast.success("Configuration sauvegardée !");
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            console.error("Error saving to Supabase:", err);
            toast.warning("Erreur lors de la sauvegarde cloud (mais sauvegardé en local).");
        }
    };

    const resetConfig = async () => {
        if (await confirm({
            title: 'Réinitialiser',
            message: 'Voulez-vous vraiment remettre les paramètres par défaut ?',
            confirmText: 'Réinitialiser',
            type: 'warning'
        })) {
            setConfig(DEFAULT_CONFIG);
            localStorage.removeItem('cleanDevis_config');

            // Optional: Reset remote too? Or just local?
            // Let's reset remote to default as well to keep sync
            try {
                await supabase
                    .from('settings')
                    .upsert({
                        key: 'global_config',
                        value: DEFAULT_CONFIG,
                        updated_at: new Date().toISOString()
                    });
                toast.success("Paramètres réinitialisés");
            } catch (e) {
                console.error("Error resetting remote config", e);
                toast.error("Erreur lors de la réinitialisation cloud");
            }
        }
    };

    const handleTestConnection = async () => {
        setApiStatus('loading');
        setApiMessage('Test en cours...');
        const result = await checkConnection();
        if (result.success) {
            setApiStatus('success');
            setApiMessage(result.message);
            toast.success(result.message);
        } else {
            setApiStatus('error');
            setApiMessage(result.message);
            toast.error(result.message);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-blue/20 rounded-xl">
                        <SettingsIcon className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">Configuration</h2>
                        <p className="text-slate-400">Paramétrez les 4 méthodes de calcul.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={resetConfig}
                        className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                    <button
                        onClick={saveConfig}
                        className="px-6 py-2 bg-brand-green hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2 font-bold shadow-lg shadow-brand-green/20"
                    >
                        {isSaved ? 'Sauvegardé !' : 'Enregistrer'}
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-8">

                {/* TOP ROW: TECHNIQUE & PRODUCTIVITÉ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* PRODUCTIVITÉ TYPO (M1) */}
                    <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <div className="p-2 bg-purple-600 rounded-lg text-white">
                                <LayoutTemplate className="w-5 h-5" />
                            </div>
                            Approche Technique : Cadences (Log/Jour)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {(Object.keys(config.productivity.typologies) as Array<keyof TypologyPerformance>).map((type) => (
                                <div key={type} className="relative">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-1">{type}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={config.productivity.typologies[type]}
                                            onChange={(e) => handleTypologyYieldChange(type, parseFloat(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 pl-3 pr-16 text-slate-900 dark:text-white focus:ring-1 focus:ring-purple-500 outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">u/jour</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COUTS & SURFACE */}
                    <div className="bg-brand-card/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <div className="p-2 bg-brand-blue rounded-lg text-white">
                                <Users className="w-5 h-5" />
                            </div>
                            Coût & Productivité Surface
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2">Coût Équipe / Jour (€ HT)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={config.dailyRate}
                                        onChange={(e) => handleChange('dailyRate', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-green outline-none font-mono text-xl font-bold"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">€</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2">Prix Plancher / Jour (€ HT)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={config.floorRate || 735}
                                        onChange={(e) => handleChange('floorRate', parseFloat(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono text-xl font-bold"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">€</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic">Prix minimum vital en dessous duquel vous ne vendez pas.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Scénario Pessimiste</label>
                                    <label className="block text-sm text-slate-500 dark:text-slate-300 mb-1">Rendement Min (m²/j)</label>
                                    <input
                                        type="number"
                                        value={config.productivity.surfaceMin}
                                        onChange={(e) => handleChange('surfaceMin', parseFloat(e.target.value), 'productivity')}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Scénario Optimiste</label>
                                    <label className="block text-sm text-slate-500 dark:text-slate-300 mb-1">Rendement Max (m²/j)</label>
                                    <input
                                        type="number"
                                        value={config.productivity.surfaceMax}
                                        onChange={(e) => handleChange('surfaceMax', parseFloat(e.target.value), 'productivity')}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE ROW: PRIX MARCHÉ (M2) */}
                <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 rounded-lg text-white">
                            <Coins className="w-5 h-5" />
                        </div>
                        Approche Marché (Comparatif)
                    </h3>

                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Définissez le prix moyen au m² utilisé pour la comparaison commerciale.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2">Prix Marché (€/m²)</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(phase => (
                                    <div key={phase}>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 text-center">{phase} Phase{phase > 1 ? 's' : ''}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={config.marketRate?.[phase] || 0}
                                                onChange={(e) => {
                                                    const newVal = parseFloat(e.target.value);
                                                    setConfig(prev => ({
                                                        ...prev,
                                                        marketRate: {
                                                            ...prev.marketRate,
                                                            [phase]: newVal
                                                        }
                                                    }));
                                                    setIsSaved(false);
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-center font-bold"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MATRIX COLOR THRESHOLDS */}
                <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-violet-600 rounded-lg text-white">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        Seuils de Couleur (Matrices)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2 font-bold text-emerald-500">Seuil "Excellent" (Vert - %)</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">L'écart est considéré comme excellent en dessous de cette valeur.</p>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.matrixThresholds?.green ?? 5}
                                    onChange={(e) => handleThresholdChange('green', parseFloat(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-xl font-bold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2 font-bold text-amber-500">Seuil "Bon" (Orange - %)</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">L'écart est considéré comme bon entre le seuil vert et celui-ci.</p>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.matrixThresholds?.orange ?? 10}
                                    onChange={(e) => handleThresholdChange('orange', parseFloat(e.target.value))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono text-xl font-bold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: INTEGRATION SELLSY */}
                <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                            <CloudLightning className="w-5 h-5" />
                        </div>
                        Intégration Sellsy CRM
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* API Keys */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <SettingsIcon className="w-4 h-4" /> Clés API
                                </h4>
                                <div className="flex items-center gap-2">
                                    {apiStatus !== 'idle' && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${apiStatus === 'success' ? 'bg-green-100 text-green-700' :
                                            apiStatus === 'error' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {apiStatus === 'loading' ? '...' : apiStatus === 'success' ? 'OK' : 'Erreur'}
                                        </span>
                                    )}
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={apiStatus === 'loading'}
                                        className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
                                    >
                                        Tester la connexion
                                    </button>
                                </div>
                            </div>

                            {apiStatus === 'error' && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                                    {apiMessage}
                                </div>
                            )}

                            <Input
                                label="Client ID"
                                value={config.sellsy?.clientId || ''}
                                onChange={(e) => handleSellsyChange('clientId', e.target.value)}
                                placeholder={isAdmin ? "Ex: xxxxx-xxxx-xxxx" : "Masqué (Admin uniquement)"}
                                disabled={!isAdmin}
                                className={!isAdmin ? "opacity-50 cursor-not-allowed" : ""}
                            />
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-600 dark:text-blue-300">
                                    Le Client Secret est géré de manière sécurisée côté serveur (Supabase Edge Functions).
                                </p>
                            </div>
                        </div>

                        {/* Product Mapping */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" /> Mapping Produits (Codes Sellsy)
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                Associez chaque phase à un Code Produit/Service existant dans votre catalogue Sellsy.
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {Object.values(Phase).map((phase) => (
                                    <Input
                                        key={phase}
                                        label={phase}
                                        labelPlacement="outside-left"
                                        value={config.sellsy?.productMapping?.[phase] || ''}
                                        onChange={(e) => handleProductMappingChange(phase, e.target.value)}
                                        placeholder={`Code pour ${phase}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
