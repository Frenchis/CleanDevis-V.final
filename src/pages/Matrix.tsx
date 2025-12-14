import React, { useState, useEffect } from 'react';
import { Grid3X3, Building, TrendingUp, Info, Settings, LayoutDashboard } from 'lucide-react';
import gsap from 'gsap';
import { Tooltip } from '../components/ui/Tooltip';
import { MatrixSettingsModal, RangeConfig } from '../components/MatrixSettingsModal';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ui/Toast';

// Helper to generate array from config
const generateArray = (config: RangeConfig): number[] => {
    const { min, max, step } = config;
    if (step <= 0) return [];
    const count = Math.floor((max - min) / step) + 1;
    return Array.from({ length: count }, (_, i) => {
        const val = min + (i * step);
        return Math.round(val * 100) / 100;
    });
};

export const Matrix = () => {
    const toast = useToast();

    // State for Inputs
    const [nbLogements, setNbLogements] = useState<number>(15);
    const [surface, setSurface] = useState<number>(1500);
    const [phases, setPhases] = useState<number>(3);
    const [prixJour, setPrixJour] = useState<number>(840);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Matrix Parameters State (Configurable)
    const [prixM2Config, setPrixM2Config] = useState<RangeConfig>({ min: 1, max: 4, step: 0.5 });
    const [prixM2Values, setPrixM2Values] = useState<number[]>([1, 1.5, 2, 2.5, 3, 3.5, 4]);

    const [m2JourConfig, setM2JourConfig] = useState<RangeConfig>({ min: 200, max: 400, step: 100 });
    const [m2JourValues, setM2JourValues] = useState<number[]>([200, 300, 400]);

    const [logementsJourConfig, setLogementsJourConfig] = useState<RangeConfig>({ min: 5, max: 7, step: 1 });
    const [logementsJourValues, setLogementsJourValues] = useState<number[]>([5, 6, 7]);

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
                    const { prixM2, m2Jour, logementsJour } = data.value;

                    if (prixM2) {
                        setPrixM2Config(prixM2);
                        setPrixM2Values(generateArray(prixM2));
                    }
                    if (m2Jour) {
                        setM2JourConfig(m2Jour);
                        setM2JourValues(generateArray(m2Jour));
                    }
                    if (logementsJour) {
                        setLogementsJourConfig(logementsJour);
                        setLogementsJourValues(generateArray(logementsJour));
                    }
                    console.log("Loaded Matrix Config from Supabase");
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

    // Calculate matrix data
    const surfaceTotale = surface * phases;
    const totalUnits = nbLogements * phases;

    const generateMatrixData = (type: 'surface' | 'logement') => {
        const values = type === 'surface' ? m2JourValues : logementsJourValues;
        let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

        const rows = prixM2Values.map((pM2, rowIdx) => {
            const prixMarche = surfaceTotale * pM2;
            const cells = values.map((val, colIdx) => {
                const nbJours = type === 'surface'
                    ? (val > 0 ? surfaceTotale / val : Infinity)
                    : (val > 0 ? totalUnits / val : Infinity);
                const prixProd = nbJours * prixJour;
                const ecart = prixMarche > 0 ? Math.abs((prixProd - prixMarche) / prixMarche * 100) : Infinity;

                if (ecart < bestCell.ecart) {
                    bestCell = { ecart, row: rowIdx, col: colIdx, prixProd, prixMarche };
                }

                return {
                    prixProd: Math.round(prixProd),
                    prixMarche: Math.round(prixMarche),
                    ecart,
                    prixM2: pM2
                };
            });
            return { prixM2: pM2, cells };
        });

        return { rows, bestCell, values };
    };

    const matrixSurface = generateMatrixData('surface');
    const matrixLogement = nbLogements > 0 ? generateMatrixData('logement') : null;

    const handleSaveConfigs = async (
        prixM2: { config: RangeConfig, values: number[] },
        m2Jour: { config: RangeConfig, values: number[] },
        logementsJour: { config: RangeConfig, values: number[] }
    ) => {
        // Update Local State
        setPrixM2Config(prixM2.config);
        setPrixM2Values(prixM2.values);

        setM2JourConfig(m2Jour.config);
        setM2JourValues(m2Jour.values);

        setLogementsJourConfig(logementsJour.config);
        setLogementsJourValues(logementsJour.values);

        // Save to Supabase
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'matrix_config',
                    value: {
                        prixM2: prixM2.config,
                        m2Jour: m2Jour.config,
                        logementsJour: logementsJour.config
                    },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
            toast.success("Configuration matrice sauvegardée !");
        } catch (err) {
            console.error("Error saving matrix config:", err);
            toast.error("Erreur de sauvegarde cloud.");
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-[1920px] mx-auto space-y-6">

            {/* TOP BAR: Inputs & Header */}
            <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 sticky top-4 z-40">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="p-2 bg-violet-500/10 rounded-xl hidden sm:block">
                        <Grid3X3 className="w-6 h-6 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Matrices de Convergence</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Rentabilité immédiate</p>
                    </div>
                </div>

                {/* HORIZONTAL INPUTS */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 w-full lg:w-auto bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">

                    {/* Surface */}
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">S / Phase (m²)</label>
                        <input
                            type="number"
                            value={surface}
                            onChange={(e) => setSurface(Number(e.target.value) || 0)}
                            className="w-24 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1"
                        />
                    </div>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                    {/* Logements */}
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Nb Logements</label>
                        <input
                            type="number"
                            value={nbLogements}
                            onChange={(e) => setNbLogements(Number(e.target.value) || 0)}
                            className="w-24 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1"
                        />
                    </div>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                    {/* Phases */}
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Nb Phases</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPhases(p)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-all ${phases === p
                                        ? 'bg-violet-500 text-white shadow-sm'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                    {/* Prix Jour */}
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Prix Jour (€)</label>
                        <input
                            type="number"
                            value={prixJour}
                            onChange={(e) => setPrixJour(Number(e.target.value) || 0)}
                            className="w-20 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1"
                        />
                    </div>
                </div>

                {/* ACTION BUTTON */}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all border border-slate-200 dark:border-slate-700"
                    title="Configurer les échelles de la matrice"
                >
                    <Settings className={`w-5 h-5 ${isLoading ? 'animate-spin opacity-50' : ''}`} />
                </button>
            </div>

            {/* RESULTS SUMMARY BAR (Compact) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/40 dark:bg-brand-card/40 border border-slate-200 dark:border-slate-700/30 rounded-xl p-3 flex items-center justify-between px-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meilleur Écart Surface</span>
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {matrixSurface.bestCell.ecart !== Infinity
                                ? `${Math.round((matrixSurface.bestCell.prixProd + matrixSurface.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €`
                                : '---'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${matrixSurface.bestCell.ecart <= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {matrixSurface.bestCell.ecart !== Infinity ? `${matrixSurface.bestCell.ecart.toFixed(1)}%` : '-'}
                        </span>
                    </div>
                </div>
                {matrixLogement && (
                    <div className="bg-white/40 dark:bg-brand-card/40 border border-slate-200 dark:border-slate-700/30 rounded-xl p-3 flex items-center justify-between px-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meilleur Écart Logement</span>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-slate-900 dark:text-white">
                                {matrixLogement.bestCell.ecart !== Infinity
                                    ? `${Math.round((matrixLogement.bestCell.prixProd + matrixLogement.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €`
                                    : '---'}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${matrixLogement.bestCell.ecart <= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {matrixLogement.bestCell.ecart !== Infinity ? `${matrixLogement.bestCell.ecart.toFixed(1)}%` : '-'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* MATRICES DISPLAY SECTION (Full Width) */}
            <div className="bento-item bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-violet-500" />
                        <h2 className="font-bold text-xl text-slate-900 dark:text-white">Analyse Croisée</h2>
                    </div>

                    {/* Légende */}
                    <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700"></div>
                            <span className="text-slate-600 dark:text-slate-400">Excellent (≤10%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700"></div>
                            <span className="text-slate-600 dark:text-slate-400">Bon (10-20%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
                            <span className="text-slate-600 dark:text-slate-400">&gt;20%</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Matrice A: Surface */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-violet-500" />
                            <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400">Matrice Surface (€/m² vs m²/jour)</h3>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">€ / m²</th>
                                        {matrixSurface.values.map(v => (
                                            <th key={v} className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{v} m²/j</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixSurface.rows.map((row, rowIdx) => (
                                        <tr key={row.prixM2} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-2 font-bold text-center text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30">{row.prixM2.toFixed(2)} €</td>
                                            {row.cells.map((cell, colIdx) => {
                                                const isBest = rowIdx === matrixSurface.bestCell.row && colIdx === matrixSurface.bestCell.col;
                                                const cellClass = cell.ecart <= 10
                                                    ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                    : cell.ecart <= 20
                                                        ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                        : 'text-slate-500 dark:text-slate-500';
                                                return (
                                                    <td
                                                        key={colIdx}
                                                        className={`p-0 text-center border-b border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${cellClass} ${isBest ? 'ring-2 ring-violet-500 ring-inset z-10 relative' : ''}`}
                                                    >
                                                        <Tooltip
                                                            className="min-w-[200px]"
                                                            content={
                                                                <div className="space-y-2">
                                                                    <div className="font-bold border-b border-slate-700 pb-1 mb-1">Détails du calcul</div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-slate-400">Production (Cadence):</span>
                                                                            <span className="font-mono font-bold text-emerald-400">{cell.prixProd.toLocaleString('fr-FR')} €</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 pl-2 opacity-80">
                                                                            (Surface totale / Cadence) x Prix Jour
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-slate-400">Cible (Prix m²):</span>
                                                                            <span className="font-mono font-bold text-violet-400">{cell.prixMarche.toLocaleString('fr-FR')} €</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 pl-2 opacity-80">
                                                                            (Surface totale x Prix M2)
                                                                        </div>
                                                                    </div>
                                                                    <div className="pt-2 border-t border-slate-700 flex justify-between gap-4">
                                                                        <span className="text-slate-300">Écart:</span>
                                                                        <span className={`font-bold ${cell.ecart <= 10 ? 'text-emerald-400' : cell.ecart <= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                            {cell.ecart.toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            }
                                                        >
                                                            <div className="p-2 h-full flex flex-col items-center justify-center gap-0.5">
                                                                <div className="font-bold text-xs">
                                                                    {cell.prixProd.toLocaleString('fr-FR')} €
                                                                </div>
                                                                <div className="text-[10px] opacity-60">
                                                                    vs {cell.prixMarche.toLocaleString('fr-FR')}
                                                                </div>
                                                                <div className="text-[10px] font-medium opacity-90 scale-90">
                                                                    {cell.ecart.toFixed(1)}%
                                                                </div>
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

                    {/* Matrice B: Logement */}
                    {matrixLogement && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-4 h-4 text-violet-500" />
                                <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400">Matrice Logement (€/m² vs log/jour)</h3>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">€ / m²</th>
                                            {matrixLogement.values.map(v => (
                                                <th key={v} className="bg-slate-50 dark:bg-slate-800 p-3 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">{v} log/j</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixLogement.rows.map((row, rowIdx) => (
                                            <tr key={row.prixM2} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="p-2 font-bold text-center text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30">{row.prixM2.toFixed(2)} €</td>
                                                {row.cells.map((cell, colIdx) => {
                                                    const isBest = rowIdx === matrixLogement.bestCell.row && colIdx === matrixLogement.bestCell.col;
                                                    const cellClass = cell.ecart <= 10
                                                        ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                        : cell.ecart <= 20
                                                            ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                            : 'text-slate-500 dark:text-slate-500';
                                                    return (
                                                        <td
                                                            key={colIdx}
                                                            className={`p-0 text-center border-b border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${cellClass} ${isBest ? 'ring-2 ring-violet-500 ring-inset z-10 relative' : ''}`}
                                                        >
                                                            <Tooltip
                                                                className="min-w-[200px]"
                                                                content={
                                                                    <div className="space-y-2">
                                                                        <div className="font-bold border-b border-slate-700 pb-1 mb-1">Détails du calcul</div>
                                                                        <div className="space-y-1">
                                                                            <div className="flex justify-between gap-4">
                                                                                <span className="text-slate-400">Production (Logts):</span>
                                                                                <span className="font-mono font-bold text-emerald-400">{cell.prixProd.toLocaleString('fr-FR')} €</span>
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 pl-2 opacity-80">
                                                                                (Nb Logts / Cadence) x Prix Jour
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <div className="flex justify-between gap-4">
                                                                                <span className="text-slate-400">Cible (Prix m²):</span>
                                                                                <span className="font-mono font-bold text-violet-400">{cell.prixMarche.toLocaleString('fr-FR')} €</span>
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 pl-2 opacity-80">
                                                                                (Surface totale x Prix M2)
                                                                            </div>
                                                                        </div>
                                                                        <div className="pt-2 border-t border-slate-700 flex justify-between gap-4">
                                                                            <span className="text-slate-300">Écart:</span>
                                                                            <span className={`font-bold ${cell.ecart <= 10 ? 'text-emerald-400' : cell.ecart <= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                                {cell.ecart.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                }
                                                            >
                                                                <div className="p-2 h-full flex flex-col items-center justify-center gap-0.5">
                                                                    <div className="font-bold text-xs">
                                                                        {cell.prixProd.toLocaleString('fr-FR')} €
                                                                    </div>
                                                                    <div className="text-[10px] opacity-60">
                                                                        vs {cell.prixMarche.toLocaleString('fr-FR')}
                                                                    </div>
                                                                    <div className="text-[10px] font-medium opacity-90 scale-90">
                                                                        {cell.ecart.toFixed(1)}%
                                                                    </div>
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
                m2JourConfig={m2JourConfig}
                logementsJourConfig={logementsJourConfig}
                onSaveConfigs={handleSaveConfigs}
            />
        </div>
    );
};
