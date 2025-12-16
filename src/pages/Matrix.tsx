import React, { useState, useEffect } from 'react';
import { Grid3X3, Building, TrendingUp, Info, Settings, LayoutDashboard } from 'lucide-react';
import gsap from 'gsap';
import { Tooltip } from '../components/ui/Tooltip';
import { MatrixSettingsModal, RangeConfig, generateArray } from '../components/MatrixSettingsModal';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ui/Toast';

export const Matrix = () => {
    const toast = useToast();

    // State for Inputs
    const [nbLogements, setNbLogements] = useState<number | ''>(15);
    const [surface, setSurface] = useState<number | ''>(1500);
    const [phases, setPhases] = useState<number>(3); // Phases usually selected via buttons, keeping number
    const [prixJour, setPrixJour] = useState<number | ''>(840);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Matrix Parameters State (Configurable)
    const [prixM2Config, setPrixM2Config] = useState<RangeConfig>({ min: 1, max: 4, step: 0.5 });
    const [prixM2Values, setPrixM2Values] = useState<number[]>([1, 1.5, 2, 2.5, 3, 3.5, 4]);

    // NEW: Prix Logement Config
    const [prixLogementConfig, setPrixLogementConfig] = useState<RangeConfig>({ min: 50, max: 200, step: 10 });
    const [prixLogementValues, setPrixLogementValues] = useState<number[]>([50, 60, 70, 80, 90, 100]);

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
                    const { prixM2, prixLogement, m2Jour, logementsJour } = data.value;

                    if (prixM2) {
                        setPrixM2Config(prixM2);
                        setPrixM2Values(generateArray(prixM2));
                    }
                    if (prixLogement) {
                        setPrixLogementConfig(prixLogement);
                        setPrixLogementValues(generateArray(prixLogement));
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
    const safeSurface = surface === '' ? 0 : surface;
    const safeNbLogements = nbLogements === '' ? 0 : nbLogements;
    const safePrixJour = prixJour === '' ? 0 : prixJour;

    // --- LOGIC FOR SURFACE MATRIX (Global Project View) ---
    // User Input: Surface / Phase
    // Calculation Bases: Total Project Surface (Surface * Phases)
    const totalSurfaceProject = safeSurface * phases;

    const generateSurfaceMatrix = () => {
        const rowValues = prixM2Values;
        const colValues = m2JourValues;

        let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

        const rows = rowValues.map((rowVal, rowIdx) => {
            // REVENUE (Marché): Total Surface * Price/m²
            const prixMarche = totalSurfaceProject * rowVal;

            const cells = colValues.map((colVal, colIdx) => {
                // COST (Production):
                // Total Duration = Total Surface / Cadence (m²/day)
                // Total Cost = Duration * Price/Day
                const nbJours = colVal > 0 ? totalSurfaceProject / colVal : Infinity;
                const prixProd = nbJours * safePrixJour;

                const ecart = prixMarche > 0 ? Math.abs((prixProd - prixMarche) / prixMarche * 100) : Infinity;

                if (ecart < bestCell.ecart) {
                    bestCell = { ecart, row: rowIdx, col: colIdx, prixProd, prixMarche };
                }

                return {
                    prixProd: Math.round(prixProd),
                    prixMarche: Math.round(prixMarche),
                    ecart,
                    rowVal,
                    nbJours // Added for Tooltip/Reference
                };
            });
            return { rowVal, cells };
        });

        return { rows, bestCell, colValues, rowValues };
    };

    // --- LOGIC FOR LOGEMENT MATRIX (Per Phase Financials, Total Project Efficiency) ---
    // User Input: Logements / Phase
    // Calculation Bases: 
    // - Efficiency (Days) calculated on TOTAL VOLUME (Logements * Phases)
    // - Financials (Cost/Rev) displayed per SINGLE PHASE
    const totalUnitsProject = safeNbLogements * phases;

    const generateLogementMatrix = () => {
        const rowValues = prixLogementValues;
        const colValues = logementsJourValues;

        let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

        const rows = rowValues.map((rowVal, rowIdx) => {
            // REVENUE (Marché): 
            // Calculated for ONE PHASE only, as requested.
            // Revenue = (Logements/Phase) * Price/Unit
            const prixMarchePhase = safeNbLogements * rowVal;

            const cells = colValues.map((colVal, colIdx) => {
                // COST (Production):
                // 1. Calculate Total Project Duration to benefit from volume efficiency
                // Total Days = (logements/phase * phases) / (logements/day)
                const totalDays = colVal > 0 ? totalUnitsProject / colVal : Infinity;

                // 2. Calculate Total Project Cost
                const totalCost = totalDays * safePrixJour;

                // 3. Normalize to ONE PHASE
                // Cost/Phase = Total Cost / Phases
                const prixProdPhase = totalCost / phases;

                const ecart = prixMarchePhase > 0 ? Math.abs((prixProdPhase - prixMarchePhase) / prixMarchePhase * 100) : Infinity;

                if (ecart < bestCell.ecart) {
                    bestCell = { ecart, row: rowIdx, col: colIdx, prixProd: prixProdPhase, prixMarche: prixMarchePhase };
                }

                return {
                    prixProd: Math.round(prixProdPhase),
                    prixMarche: Math.round(prixMarchePhase),
                    ecart,
                    rowVal,
                    totalDays // For debug/display
                };
            });
            return { rowVal, cells };
        });

        return { rows, bestCell, colValues, rowValues };
    };

    const matrixSurface = generateSurfaceMatrix();
    const matrixLogement = generateLogementMatrix();

    const handleSaveConfigs = async (
        prixM2: { config: RangeConfig, values: number[] },
        prixLogement: { config: RangeConfig, values: number[] },
        m2Jour: { config: RangeConfig, values: number[] },
        logementsJour: { config: RangeConfig, values: number[] }
    ) => {
        // Update Local State
        setPrixM2Config(prixM2.config);
        setPrixM2Values(prixM2.values);

        setPrixLogementConfig(prixLogement.config);
        setPrixLogementValues(prixLogement.values);

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
                        prixLogement: prixLogement.config,
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Rentabilité immédiate & Analyse de Cadence</p>
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
                            onChange={(e) => setSurface(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-24 bg-transparent font-bold text-slate-900 dark:text-white outline-none border-b border-slate-300 dark:border-slate-600 focus:border-violet-500 text-sm py-1"
                        />
                    </div>

                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                    {/* Logements */}
                    <div className="flex flex-col px-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Log / Phase</label>
                        <input
                            type="number"
                            value={nbLogements}
                            onChange={(e) => setNbLogements(e.target.value === '' ? '' : Number(e.target.value))}
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
                            onChange={(e) => setPrixJour(e.target.value === '' ? '' : Number(e.target.value))}
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
                {safeSurface > 0 && (
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
                )}

                {safeNbLogements > 0 && (
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
            {(safeSurface > 0 || safeNbLogements > 0) && (
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
                        {safeSurface > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-violet-500" />
                                    <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400">Matrice Surface (€/m² vs Cadence)</h3>
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
                                                                <span className="text-[10px] normal-case bg-slate-200 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-normal">
                                                                    {days}j
                                                                </span>
                                                            </div>
                                                        </th>
                                                    )
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matrixSurface.rows.map((row) => (
                                                <tr key={row.rowVal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-2 font-bold text-center text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30">{row.rowVal.toFixed(2)} €</td>
                                                    {row.cells.map((cell, colIdx) => {
                                                        const ecart = cell.ecart;
                                                        const cellClass = ecart <= 10
                                                            ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                            : ecart <= 20
                                                                ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                                : 'text-slate-500 dark:text-slate-500';

                                                        return (
                                                            <td
                                                                key={colIdx}
                                                                className={`p-0 text-center border-b border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${cellClass}`}
                                                            >
                                                                <Tooltip
                                                                    className="min-w-[200px]"
                                                                    content={
                                                                        <div className="space-y-2">
                                                                            <div className="font-bold border-b border-slate-700 pb-1 mb-1">Détails Projet (Global)</div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-400">Production ({Math.round(cell.nbJours)}j):</span>
                                                                                    <span className="font-mono font-bold text-emerald-400">{cell.prixProd.toLocaleString('fr-FR')} €</span>
                                                                                </div>

                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-400">Cible (Rev):</span>
                                                                                    <span className="font-mono font-bold text-violet-400">{cell.prixMarche.toLocaleString('fr-FR')} €</span>
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500 pl-2 opacity-80">
                                                                                    {totalSurfaceProject.toLocaleString('fr-FR')} m² x {row.rowVal} €
                                                                                </div>
                                                                            </div>
                                                                            <div className="pt-2 border-t border-slate-700 flex justify-between gap-4">
                                                                                <span className="text-slate-300">Écart:</span>
                                                                                <span className={`font-bold ${ecart <= 10 ? 'text-emerald-400' : ecart <= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                                    {ecart.toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    }
                                                                >
                                                                    <div className="p-2 h-full flex flex-col items-center justify-center gap-0.5">
                                                                        <div className="font-bold text-xs">
                                                                            {cell.prixProd.toLocaleString('fr-FR')} €
                                                                        </div>
                                                                        {/* <div className="text-[10px] opacity-60">
                                                                    vs {cell.prixMarche.toLocaleString('fr-FR')}
                                                                </div> */}
                                                                        <div className="text-[10px] font-medium opacity-90 scale-90">
                                                                            {ecart.toFixed(1)}%
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

                        {/* Matrice B: Logement */}
                        {safeNbLogements > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-violet-500" />
                                    <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400">Matrice Logement (Prix/Phase vs Cadence Globale)</h3>
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
                                                                <span className="text-[10px] normal-case bg-slate-200 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-normal">
                                                                    {days}j
                                                                </span>
                                                            </div>
                                                        </th>
                                                    )
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matrixLogement.rows.map((row) => (
                                                <tr key={row.rowVal} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-2 font-bold text-center text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30">{row.rowVal.toFixed(0)} €</td>
                                                    {row.cells.map((cell, colIdx) => {
                                                        const ecart = cell.ecart;
                                                        const cellClass = ecart <= 10
                                                            ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                                            : ecart <= 20
                                                                ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                                : 'text-slate-500 dark:text-slate-500';
                                                        return (
                                                            <td
                                                                key={colIdx}
                                                                className={`p-0 text-center border-b border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${cellClass}`}
                                                            >
                                                                <Tooltip
                                                                    className="min-w-[200px]"
                                                                    content={
                                                                        <div className="space-y-2">
                                                                            <div className="font-bold border-b border-slate-700 pb-1 mb-1">Détails par Phase</div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-400">Coût Phase:</span>
                                                                                    <span className="font-mono font-bold text-emerald-400">{cell.prixProd.toLocaleString('fr-FR')} €</span>
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500 pl-2 opacity-80 leading-tight">
                                                                                    (Coût Global {Math.ceil(cell.totalDays)}j / {phases})
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-400">Rev Phase:</span>
                                                                                    <span className="font-mono font-bold text-violet-400">{cell.prixMarche.toLocaleString('fr-FR')} €</span>
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500 pl-2 opacity-80 leading-tight">
                                                                                    {safeNbLogements}u x {row.rowVal}€
                                                                                </div>
                                                                            </div>
                                                                            <div className="pt-2 border-t border-slate-700 flex justify-between gap-4">
                                                                                <span className="text-slate-300">Écart:</span>
                                                                                <span className={`font-bold ${ecart <= 10 ? 'text-emerald-400' : ecart <= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                                    {ecart.toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    }
                                                                >
                                                                    <div className="p-2 h-full flex flex-col items-center justify-center gap-0.5">
                                                                        <div className="font-bold text-xs">
                                                                            {cell.prixProd.toLocaleString('fr-FR')} €
                                                                        </div>
                                                                        {/* <div className="text-[10px] opacity-60">
                                                                        vs {cell.prixMarche.toLocaleString('fr-FR')}
                                                                    </div> */}
                                                                        <div className="text-[10px] font-medium opacity-90 scale-90">
                                                                            {ecart.toFixed(1)}%
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
            )}

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
