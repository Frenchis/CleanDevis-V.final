import React, { useState, useEffect } from 'react';
import { Grid3X3, Building, TrendingUp, Info, Settings, LayoutDashboard } from 'lucide-react';
import gsap from 'gsap';
import { Tooltip } from '../components/ui/Tooltip';
import { MatrixSettingsModal, RangeConfig, generateArray } from '../components/MatrixSettingsModal';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ui/Toast';

// --- SKELETON COMPONENT ---
const MatrixSkeleton = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
            <Icon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/20">
            <div className="flex">
                <div className="w-20 h-10 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex-1 h-10 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 last:border-r-0" />
                ))}
            </div>
            {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex border-t border-slate-100 dark:border-slate-700/50">
                    <div className="w-20 h-12 bg-slate-50/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                    {[1, 2, 3].map(col => (
                        <div key={col} className="flex-1 h-12 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                            <div className="flex flex-col items-center gap-1 w-full px-4">
                                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded-sm animate-pulse" />
                                <div className="h-2 w-10 bg-slate-100 dark:bg-slate-800 rounded-sm animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const Matrix = () => {
    const toast = useToast();

    // State for Inputs (Empty by default)
    const [nbLogements, setNbLogements] = useState<number | ''>('');
    const [surface, setSurface] = useState<number | ''>('');
    const [phases, setPhases] = useState<number>(3);
    const [prixJour, setPrixJour] = useState<number | ''>(840);

    // Settings & Loading
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Matrix Parameters State
    const [prixM2Config, setPrixM2Config] = useState<RangeConfig>({ min: 1, max: 4, step: 0.5 });
    const [prixM2Values, setPrixM2Values] = useState<number[]>([1, 1.5, 2, 2.5, 3, 3.5, 4]);

    const [prixLogementConfig, setPrixLogementConfig] = useState<RangeConfig>({ min: 50, max: 200, step: 10 });
    const [prixLogementValues, setPrixLogementValues] = useState<number[]>([50, 60, 70, 80, 90, 100]);

    const [m2JourConfig, setM2JourConfig] = useState<RangeConfig>({ min: 200, max: 400, step: 100 });
    const [m2JourValues, setM2JourValues] = useState<number[]>([200, 300, 400]);

    const [logementsJourConfig, setLogementsJourConfig] = useState<RangeConfig>({ min: 5, max: 7, step: 1 });
    const [logementsJourValues, setLogementsJourValues] = useState<number[]>([5, 6, 7]);

    const [thresholds, setThresholds] = useState({ green: 5, orange: 10 });
    const [floorRate, setFloorRate] = useState(735);
    const [showProfitability, setShowProfitability] = useState(false);

    // Load from Supabase on mount
    useEffect(() => {
        const loadMatrixConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'matrix_config')
                    .single();

                if (data && data.value) {
                    const { prixM2, prixLogement, m2Jour, logementsJour } = data.value;
                    if (prixM2) { setPrixM2Config(prixM2); setPrixM2Values(generateArray(prixM2)); }
                    if (prixLogement) { setPrixLogementConfig(prixLogement); setPrixLogementValues(generateArray(prixLogement)); }
                    if (m2Jour) { setM2JourConfig(m2Jour); setM2JourValues(generateArray(m2Jour)); }
                    if (logementsJour) { setLogementsJourConfig(logementsJour); setLogementsJourValues(generateArray(logementsJour)); }
                }

                // Load global_config for thresholds
                const { data: globalData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'global_config')
                    .single();

                if (globalData && globalData.value && globalData.value.matrixThresholds) {
                    setThresholds(globalData.value.matrixThresholds);
                }
                if (globalData && globalData.value && globalData.value.floorRate) {
                    setFloorRate(globalData.value.floorRate);
                }
            } catch (err) {
                console.error("Error loading matrix settings:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadMatrixConfig();
    }, []);

    // GSAP Animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".bento-item", {
                y: 20,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power2.out"
            });
        });
        return () => ctx.revert();
    }, []);

    // Helpers
    const safeSurface = surface === '' ? 0 : surface;
    const safeNbLogements = nbLogements === '' ? 0 : nbLogements;
    const safePrixJour = prixJour === '' ? 0 : prixJour;

    const totalSurfaceProject = safeSurface * phases;
    const totalUnitsProject = safeNbLogements * phases;

    // Generators
    const generateSurfaceMatrix = () => {
        const rowValues = prixM2Values;
        const colValues = m2JourValues;
        let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

        const rows = rowValues.map((rowVal, rowIdx) => {
            const prixMarchePhase = safeSurface * rowVal;
            const cells = colValues.map((colVal, colIdx) => {
                const totalDays = colVal > 0 ? totalSurfaceProject / colVal : Infinity;
                const totalCost = totalDays * safePrixJour;
                const prixProd = totalCost;

                const ecart = prixMarchePhase > 0 ? Math.abs((prixProd - prixMarchePhase) / prixMarchePhase * 100) : Infinity;
                if (ecart < bestCell.ecart) bestCell = { ecart, row: rowIdx, col: colIdx, prixProd, prixMarche: prixMarchePhase };

                // Profitability Logic
                const dailyRateEquiv = totalDays > 0 ? prixMarchePhase / totalDays : 0;
                const margin = prixMarchePhase - (totalDays * floorRate);

                return { prixProd: Math.round(prixProd), prixMarche: Math.round(prixMarchePhase), totalCost: Math.round(totalCost), totalDays, ecart, rowVal, dailyRateEquiv, margin };
            });
            return { rowVal, cells };
        });
        return { rows, bestCell, colValues, rowValues };
    };

    const generateLogementMatrix = () => {
        const rowValues = prixLogementValues;
        const colValues = logementsJourValues;
        let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

        const rows = rowValues.map((rowVal, rowIdx) => {
            const prixMarchePhase = safeNbLogements * rowVal;
            const cells = colValues.map((colVal, colIdx) => {
                const totalDays = colVal > 0 ? totalUnitsProject / colVal : Infinity;
                const totalCost = totalDays * safePrixJour;
                const prixProd = totalCost;

                const ecart = prixMarchePhase > 0 ? Math.abs((prixProd - prixMarchePhase) / prixMarchePhase * 100) : Infinity;
                if (ecart < bestCell.ecart) bestCell = { ecart, row: rowIdx, col: colIdx, prixProd, prixMarche: prixMarchePhase };

                // Profitability Logic
                const dailyRateEquiv = totalDays > 0 ? prixMarchePhase / totalDays : 0;
                const margin = prixMarchePhase - (totalDays * floorRate);

                return { prixProd: Math.round(prixProd), prixMarche: Math.round(prixMarchePhase), totalCost: Math.round(totalCost), totalDays, ecart, rowVal, dailyRateEquiv, margin };
            });
            return { rowVal, cells };
        });
        return { rows, bestCell, colValues, rowValues };
    };

    const matrixSurface = generateSurfaceMatrix();
    const matrixLogement = generateLogementMatrix();

    const handleSaveConfigs = async (pM2: any, pLog: any, m2J: any, logJ: any) => {
        setPrixM2Config(pM2.config); setPrixM2Values(pM2.values);
        setPrixLogementConfig(pLog.config); setPrixLogementValues(pLog.values);
        setM2JourConfig(m2J.config); setM2JourValues(m2J.values);
        setLogementsJourConfig(logJ.config); setLogementsJourValues(logJ.values);

        try {
            await supabase.from('settings').upsert({
                key: 'matrix_config',
                value: { prixM2: pM2.config, prixLogement: pLog.config, m2Jour: m2J.config, logementsJour: logJ.config },
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
            toast.success("Configuration sauvegardée !");
        } catch (err) { console.error(err); toast.error("Erreur sauvegarde."); }
    };

    // Derived States for skeleton logic
    const showSurface = safeSurface > 0;
    const showLogement = safeNbLogements > 0;
    const showSkeletons = !showSurface && !showLogement; // Show both skeletons if nothing is entered

    return (
        <div className="p-4 md:p-6 max-w-[1920px] mx-auto space-y-6">

            {/* TOP BAR: Inputs */}
            <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 sticky top-4 z-40">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="p-2 bg-violet-500/10 rounded-xl hidden sm:block">
                        <Grid3X3 className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Matrices de Convergence</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Comparaison Méthode Cadence vs Méthode Surface</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 w-full lg:w-auto bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Surface Projet (m²)</label>
                        <input type="number" value={surface} onChange={(e) => setSurface(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" className="w-24 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1 placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Logements Projet</label>
                        <input type="number" value={nbLogements} onChange={(e) => setNbLogements(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" className="w-24 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1 placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Nb Phases</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(p => (
                                <button key={p} onClick={() => setPhases(p)} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all ${phases === p ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300'}`}>{p}</button>
                            ))}
                        </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Prix Jour (€)</label>
                        <input type="number" value={prixJour} onChange={(e) => setPrixJour(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1" />
                    </div>
                </div>

                <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all border border-slate-200 dark:border-slate-700" title="Configurer les échelles">
                    <Settings className={`w-5 h-5 ${isLoading ? 'animate-spin opacity-50' : ''}`} />
                </button>
            </div>

            {/* RESULTS SUMMARY BAR (Only if Data) */}
            {(showSurface || showLogement) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    {showSurface && (
                        <div className="bg-white/40 dark:bg-brand-card/40 border border-slate-200 dark:border-slate-700/30 rounded-xl p-3 flex items-center justify-between px-6">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meilleur Écart Surface</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold text-slate-900 dark:text-white">
                                    {matrixSurface.bestCell.ecart !== Infinity ? `${Math.round((matrixSurface.bestCell.prixProd + matrixSurface.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €` : '---'}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${matrixSurface.bestCell.ecart <= thresholds.green ? 'bg-emerald-100 text-emerald-700' : matrixSurface.bestCell.ecart <= thresholds.orange ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {matrixSurface.bestCell.ecart !== Infinity ? `${matrixSurface.bestCell.ecart.toFixed(1)}%` : '-'}
                                </span>
                            </div>
                        </div>
                    )}
                    {showLogement && (
                        <div className="bg-white/40 dark:bg-brand-card/40 border border-slate-200 dark:border-slate-700/30 rounded-xl p-3 flex items-center justify-between px-6">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meilleur Écart Logement</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold text-slate-900 dark:text-white">
                                    {matrixLogement.bestCell.ecart !== Infinity ? `${Math.round((matrixLogement.bestCell.prixProd + matrixLogement.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €` : '---'}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${matrixLogement.bestCell.ecart <= thresholds.green ? 'bg-emerald-100 text-emerald-700' : matrixLogement.bestCell.ecart <= thresholds.orange ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {matrixLogement.bestCell.ecart !== Infinity ? `${matrixLogement.bestCell.ecart.toFixed(1)}%` : '-'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MATRICES CONTAINER */}
            <div className="bento-item bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg min-h-[500px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-violet-500" />
                        <h2 className="font-bold text-xl text-slate-900 dark:text-white">Analyse Croisée</h2>
                    </div>
                    {/* Légende only if visible data */}
                    {(showSurface || showLogement) && (
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Toggle Mode Rentabilité */}
                            <button
                                onClick={() => setShowProfitability(!showProfitability)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showProfitability
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                                    }`}
                            >
                                <TrendingUp className={`w-3.5 h-3.5 ${showProfitability ? 'animate-pulse' : ''}`} />
                                {showProfitability ? 'Mode Rentabilité : ON' : 'Mode Rentabilité : OFF'}
                            </button>

                            <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg">
                                {!showProfitability ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700"></div>
                                            <span className="text-slate-600 dark:text-slate-400">Excellent (≤{thresholds.green}%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700"></div>
                                            <span className="text-slate-600 dark:text-slate-400">Bon ({thresholds.green}-{thresholds.orange}%)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
                                            <span className="text-slate-600 dark:text-slate-400">&gt;{thresholds.orange}%</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700"></div>
                                            <span className="text-slate-600 dark:text-slate-400">Rentable (≥{prixJour || 840}€/j)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700"></div>
                                            <span className="text-slate-600 dark:text-slate-400">Négo ({floorRate}-{prixJour || 840}€/j)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700"></div>
                                            <span className="text-slate-600 dark:text-slate-400">Perte (&lt;{floorRate}€/j)</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-12">
                    {/* --- SKELETON DISPLAY (If Empty) --- */}
                    {showSkeletons && (
                        <div className="space-y-12 animate-in fade-in duration-700">
                            <div className="p-4 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-xl mb-6 text-center">
                                <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">✨ Renseignez une Surface ou un nombre de Logements ci-dessus pour générer les matrices.</p>
                            </div>
                            <MatrixSkeleton title="Matrice Surface" icon={TrendingUp} />
                            <MatrixSkeleton title="Matrice Logement" icon={Building} />
                        </div>
                    )}

                    {/* Matrice A: Surface */}
                    {showSurface && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4 text-violet-500" />
                                <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400">Matrice Surface (Prix/m² vs Prix Cadence)</h3>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">€ / m²</th>
                                            {matrixSurface.colValues.map(v => {
                                                const days = v > 0 ? Math.ceil(totalSurfaceProject / v) : 0;
                                                return (
                                                    <th key={v} className="bg-slate-50 dark:bg-slate-800 p-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span>{v} m²/j</span>
                                                            <span className="text-[10px] normal-case bg-slate-200 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-normal">{days}j</span>
                                                        </div>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixSurface.rows.map((row, rowIdx) => (
                                            <tr key={row.rowVal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="p-2 font-bold text-center text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30">{row.rowVal.toFixed(2)} €</td>
                                                {row.cells.map((cell, colIdx) => {
                                                    const ecart = cell.ecart;
                                                    const dailyRateEquiv = (cell as any).dailyRateEquiv;
                                                    const margin = (cell as any).margin;
                                                    const isLowProfit = dailyRateEquiv < floorRate;

                                                    let cellClass = "";
                                                    if (showProfitability) {
                                                        cellClass = dailyRateEquiv >= (prixJour || 840)
                                                            ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                            : dailyRateEquiv >= floorRate
                                                                ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                                : 'bg-red-100/80 dark:bg-red-900/40 text-red-800 dark:text-red-300';
                                                    } else {
                                                        cellClass = ecart <= thresholds.green
                                                            ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                            : ecart <= thresholds.orange
                                                                ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                                : 'text-slate-500 dark:text-slate-500';
                                                    }

                                                    const isBest = matrixSurface.bestCell.ecart !== Infinity && matrixSurface.bestCell.row === rowIdx && matrixSurface.bestCell.col === colIdx;
                                                    const bestClass = isBest ? "bg-violet-100 dark:bg-violet-900/40 font-bold scale-105 shadow-md z-10" : "";
                                                    const floorClass = isLowProfit ? "ring-2 ring-red-500 ring-inset" : "";

                                                    return (
                                                        <td key={colIdx} className={`p-0 text-center border-b border-r border-slate-100 dark:border-slate-800 last:border-r-0 cursor-help ${cellClass} ${bestClass} ${floorClass}`}>
                                                            <Tooltip className="min-w-[280px]" content={
                                                                <div className="space-y-3">
                                                                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-xs uppercase tracking-wider text-slate-400">Détails de Rentabilité</div>

                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                                                            <div className="text-[10px] text-slate-500 uppercase">Équiv. Jour</div>
                                                                            <div className={`text-sm font-bold ${dailyRateEquiv >= (prixJour || 840) ? 'text-emerald-400' : dailyRateEquiv >= floorRate ? 'text-amber-400' : 'text-red-400'}`}>
                                                                                {Math.round(dailyRateEquiv).toLocaleString()} €/j
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                                                            <div className="text-[10px] text-slate-500 uppercase">Marge / Plancher</div>
                                                                            <div className={`text-sm font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                                {Math.round(margin).toLocaleString()} €
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-1 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                                                                        <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Cibles</div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400"><span>Prix Plancher :</span><span className="font-mono text-white">{(cell.totalDays * floorRate).toLocaleString('fr-FR')} €</span></div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400"><span>Prix Standard :</span><span className="font-mono text-white">{cell.prixProd.toLocaleString('fr-FR')} €</span></div>
                                                                    </div>

                                                                    <div className="pt-1 text-[10px] text-slate-500 italic">
                                                                        * Marge calculée par rapport au prix plancher de {floorRate}€/j.
                                                                    </div>

                                                                    <div className="pt-2 border-t border-slate-700 flex justify-between gap-4">
                                                                        <span className="text-slate-300">Écart Méthodes:</span>
                                                                        <span className={`font-bold ${ecart <= thresholds.green ? 'text-emerald-400' : ecart <= thresholds.orange ? 'text-amber-400' : 'text-red-400'}`}>{ecart.toFixed(1)}%</span>
                                                                    </div>
                                                                </div>
                                                            }>
                                                                <div className="p-2 h-full flex flex-col items-center justify-center gap-0.5 min-h-[50px]">
                                                                    {showProfitability ? (
                                                                        <>
                                                                            <div className="font-bold text-xs">{Math.round(dailyRateEquiv)} €/j</div>
                                                                            <div className="text-[10px] font-bold opacity-60">Marge: {Math.round(margin).toLocaleString()}€</div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">{cell.prixProd.toLocaleString('fr-FR')}</div>
                                                                            <div className="text-[10px] font-medium text-violet-700 dark:text-violet-400 opacity-80">{cell.prixMarche.toLocaleString('fr-FR')}</div>
                                                                            <div className="text-[10px] font-bold opacity-60 scale-90 mt-0.5">{ecart.toFixed(1)}%</div>
                                                                        </>
                                                                    )}
                                                                    {isLowProfit && <div className="absolute top-1 right-1 text-red-500">⚠️</div>}
                                                                </div>
                                                            </Tooltip>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Matrice B: Logement */}
                    {showLogement && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4 text-violet-500" />
                                <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400">Matrice Logement (Prix/Unité vs Prix Cadence)</h3>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">€ / Unité</th>
                                            {matrixLogement.colValues.map(v => {
                                                const days = v > 0 ? Math.ceil(totalUnitsProject / v) : 0;
                                                return (
                                                    <th key={v} className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span>{v} u/j</span>
                                                            <span className="text-[10px] normal-case bg-slate-200 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-normal">{days}j</span>
                                                        </div>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixLogement.rows.map((row, rowIdx) => (
                                            <tr key={row.rowVal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="p-2 font-bold text-center text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30">{row.rowVal.toFixed(0)} €</td>
                                                {row.cells.map((cell, colIdx) => {
                                                    const ecart = cell.ecart;
                                                    const cellClass = ecart <= thresholds.green ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : ecart <= thresholds.orange ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-500';
                                                    const isBest = matrixLogement.bestCell.ecart !== Infinity && matrixLogement.bestCell.row === rowIdx && matrixLogement.bestCell.col === colIdx;
                                                    const bestClass = isBest ? "bg-violet-100 dark:bg-violet-900/40 font-bold scale-105 shadow-md z-10" : "";

                                                    return (
                                                        <td key={colIdx} className={`p-0 text-center border-b border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${cellClass} ${bestClass}`}>
                                                            <Tooltip className="min-w-[240px]" content={
                                                                <div className="space-y-3">
                                                                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-xs uppercase tracking-wider text-slate-400">Détails Calcul</div>
                                                                    <div className="space-y-1 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                                                                        <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Méthode Cadence</div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400"><span>Volume Total :</span><span className="font-mono text-white">{totalUnitsProject.toLocaleString()} u</span></div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400"><span>Cadence :</span><span className="font-mono text-white">{matrixLogement.colValues[colIdx]} u/j</span></div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400 border-b border-emerald-500/20 pb-1"><span>Durée Projet :</span><span className="font-mono text-white">{Number(cell.totalDays).toFixed(1)} jours</span></div>
                                                                        <div className="flex justify-between gap-2 pt-1 font-bold"><span className="text-emerald-400">Prix Cadence :</span><span className="font-mono text-white">{cell.prixProd.toLocaleString('fr-FR')} €</span></div>
                                                                    </div>
                                                                    <div className="space-y-1 bg-violet-500/10 p-2 rounded border border-violet-500/20">
                                                                        <div className="text-[10px] font-bold text-violet-400 uppercase mb-1">Méthode Unitaire</div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400"><span>Logements :</span><span className="font-mono text-white">{safeNbLogements.toLocaleString()} u</span></div>
                                                                        <div className="flex justify-between gap-2 text-[10px] text-slate-400 border-b border-violet-500/20 pb-1"><span>Prix Unitaire :</span><span className="font-mono text-white">{row.rowVal} €/u</span></div>
                                                                        <div className="flex justify-between gap-2 pt-1 font-bold"><span className="text-violet-400">Prix Unitaire :</span><span className="font-mono text-white">{cell.prixMarche.toLocaleString('fr-FR')} €</span></div>
                                                                    </div>
                                                                    <div className="pt-2 border-t border-slate-700 flex justify-between gap-4"><span className="text-slate-300">Écart :</span><span className={`font-bold ${ecart <= thresholds.green ? 'text-emerald-400' : ecart <= thresholds.orange ? 'text-amber-400' : 'text-red-400'}`}>{ecart.toFixed(1)}%</span></div>
                                                                </div>
                                                            }>
                                                                <div className="p-2 h-full flex flex-col items-center justify-center gap-0.5 min-h-[50px]">
                                                                    <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">{cell.prixProd.toLocaleString('fr-FR')}</div>
                                                                    <div className="text-[10px] font-medium text-violet-700 dark:text-violet-400 opacity-80">{cell.prixMarche.toLocaleString('fr-FR')}</div>
                                                                    <div className="text-[10px] font-bold opacity-60 scale-90 mt-0.5">{ecart.toFixed(1)}%</div>
                                                                </div>
                                                            </Tooltip>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <MatrixSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                prixM2Config={prixM2Config}
                prixLogementConfig={prixLogementConfig}
                m2JourConfig={m2JourConfig}
                logementsJourConfig={logementsJourConfig}
                onSaveConfigs={handleSaveConfigs}
            />
        </div>
    );
};
