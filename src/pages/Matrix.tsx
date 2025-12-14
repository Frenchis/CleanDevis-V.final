import React, { useState, useEffect } from 'react';
import { Grid3X3, Building, TrendingUp, Info } from 'lucide-react';
import gsap from 'gsap';
import { Tooltip } from '../components/ui/Tooltip';

export const Matrix = () => {
    // State for Inputs
    const [nbLogements, setNbLogements] = useState<number>(15);
    const [surface, setSurface] = useState<number>(1500);
    const [phases, setPhases] = useState<number>(3);

    // Matrix Parameters State
    const [prixJour, setPrixJour] = useState<number>(840);
    const PRIX_M2_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4];
    const M2_JOUR_VALUES = [200, 300, 400];
    const LOGEMENTS_JOUR_VALUES = [5, 6, 7];

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
        const values = type === 'surface' ? M2_JOUR_VALUES : LOGEMENTS_JOUR_VALUES;
        let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

        const rows = PRIX_M2_VALUES.map((pM2, rowIdx) => {
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

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                    <Grid3X3 className="w-8 h-8 text-violet-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Matrices de Convergence</h1>
                    <p className="text-slate-500 dark:text-slate-400">Analysez la rentabilité selon la surface et le nombre de logements</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* INPUTS SECTION */}
                <div className="bento-item md:col-span-12 lg:col-span-4 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg h-fit">
                    <div className="flex items-center gap-3 text-brand-blue mb-6">
                        <div className="p-2 bg-brand-blue/10 rounded-xl">
                            <Building className="w-6 h-6" />
                        </div>
                        <h2 className="font-bold text-xl text-slate-900 dark:text-white">Paramètres du Projet</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Surface par Phase (m²)</label>
                            <input
                                type="number"
                                value={surface}
                                onChange={(e) => setSurface(Number(e.target.value) || 0)}
                                className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-white outline-none mt-1"
                            />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Nombre de Logements</label>
                            <input
                                type="number"
                                value={nbLogements}
                                onChange={(e) => setNbLogements(Number(e.target.value) || 0)}
                                className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-white outline-none mt-1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Nombre de Phases</label>
                            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                {[1, 2, 3, 4].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPhases(p)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${phases === p
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Prix Référence Journée (€)</label>
                            <input
                                type="number"
                                value={prixJour}
                                onChange={(e) => setPrixJour(Number(e.target.value) || 0)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 font-bold text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Convergence Summary - Results */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-4">
                            <Info className="w-4 h-4" />
                            Résultats
                        </h4>
                        <div className="flex flex-col gap-6">
                            <div className="">
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Convergence Surface</div>
                                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {matrixSurface.bestCell.ecart !== Infinity
                                        ? `${Math.round((matrixSurface.bestCell.prixProd + matrixSurface.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €`
                                        : '---'}
                                </div>
                                <div className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-medium">
                                    soit ~{Math.round((matrixSurface.bestCell.prixProd + matrixSurface.bestCell.prixMarche) / 2 / (nbLogements || 1)).toLocaleString('fr-FR')} € / logt
                                </div>
                            </div>

                            {matrixLogement && (
                                <div className="pt-6 border-t border-dashed border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Convergence Logement</div>
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                        {matrixLogement.bestCell.ecart !== Infinity
                                            ? `${Math.round((matrixLogement.bestCell.prixProd + matrixLogement.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €`
                                            : '---'}
                                    </div>
                                    <div className="text-xs text-violet-600 dark:text-violet-400 mt- font-medium">
                                        soit ~{Math.round((matrixLogement.bestCell.prixProd + matrixLogement.bestCell.prixMarche) / 2 / (nbLogements || 1)).toLocaleString('fr-FR')} € / logt
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MATRICES DISPLAY SECTION */}
                <div className="bento-item md:col-span-12 lg:col-span-8 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <h2 className="font-bold text-xl text-slate-900 dark:text-white">Analyse de Convergence</h2>

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

                    <div className="space-y-8">
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
                                                                                <span className="text-slate-400">Cible (Marché):</span>
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
                                                                                    <span className="text-slate-400">Cible (Marché):</span>
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
            </div>
        </div>
    );
};
