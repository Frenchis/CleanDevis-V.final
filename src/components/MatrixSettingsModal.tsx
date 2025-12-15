import React, { useState, useEffect } from 'react';
import { Settings, Save, X, RotateCcw, TrendingUp, Grid3X3 } from 'lucide-react';


// Define Range Config Type
export type RangeConfig = {
    min: number;
    max: number;
    step: number;
};

// Internal Draft Type for UI editing (allows empty strings)
type DraftRangeConfig = {
    min: number | '';
    max: number | '';
    step: number | '';
};

// Sub-component for a single range input group
const RangeInputGroup = ({
    label,
    config,
    onChange,
    unit = ''
}: {
    label: string,
    config: DraftRangeConfig,
    onChange: (c: DraftRangeConfig) => void,
    unit?: string
}) => {
    return (
        <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                {label}
                <span className="text-xs font-normal text-slate-400">
                    {config.min} - {config.max} {unit} (Pas: {config.step})
                </span>
            </label>
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Min</span>
                    <input
                        type="number"
                        value={config.min}
                        onChange={(e) => onChange({ ...config, min: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Max</span>
                    <input
                        type="number"
                        value={config.max}
                        onChange={(e) => onChange({ ...config, max: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Pas (Step)</span>
                    <input
                        type="number"
                        value={config.step}
                        onChange={(e) => onChange({ ...config, step: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    />
                </div>
            </div>
        </div>
    );
};

// Helper: Generate array from config
export const generateArray = (config: RangeConfig | DraftRangeConfig): number[] => {
    // Treat empty strings as 0 for generation purpose (or just standard 0)
    const min = config.min === '' ? 0 : config.min;
    const max = config.max === '' ? 0 : config.max;
    const step = config.step === '' ? 0 : config.step;

    if (step <= 0) return [];

    // Safety check to prevent infinite loops or massive arrays
    const count = Math.floor((max - min) / step) + 1;
    if (count > 100) return [min, max]; // Fallback if too large

    return Array.from({ length: count }, (_, i) => {
        const val = min + (i * step);
        return Math.round(val * 100) / 100;
    });
};

interface MatrixSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;

    prixM2Config: RangeConfig;
    prixLogementConfig?: RangeConfig; // Optional for backward compatibility but we'll use it
    m2JourConfig: RangeConfig;
    logementsJourConfig: RangeConfig;

    onSaveConfigs: (
        prixM2: { config: RangeConfig, values: number[] },
        prixLogement: { config: RangeConfig, values: number[] },
        m2Jour: { config: RangeConfig, values: number[] },
        logementsJour: { config: RangeConfig, values: number[] }
    ) => void;
}

export const MatrixSettingsModal: React.FC<MatrixSettingsModalProps> = ({
    isOpen,
    onClose,
    prixM2Config,
    prixLogementConfig,
    m2JourConfig,
    logementsJourConfig,
    onSaveConfigs,
}) => {
    // State for local changes (Draft allows empty via DraftRangeConfig)
    const [localPrixM2, setLocalPrixM2] = useState<DraftRangeConfig>(prixM2Config);
    const [localPrixLogement, setLocalPrixLogement] = useState<DraftRangeConfig>(prixLogementConfig || { min: 50, max: 200, step: 10 });
    const [localM2Jour, setLocalM2Jour] = useState<DraftRangeConfig>(m2JourConfig);
    const [localLogementsJour, setLocalLogementsJour] = useState<DraftRangeConfig>(logementsJourConfig);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setLocalPrixM2(prixM2Config);
            setLocalPrixLogement(prixLogementConfig || { min: 50, max: 200, step: 10 });
            setLocalM2Jour(m2JourConfig);
            setLocalLogementsJour(logementsJourConfig);
        }
    }, [isOpen, prixM2Config, prixLogementConfig, m2JourConfig, logementsJourConfig]);

    const toFinalConfig = (d: DraftRangeConfig): RangeConfig => ({
        min: d.min === '' ? 0 : d.min,
        max: d.max === '' ? 0 : d.max,
        step: d.step === '' ? 0 : d.step,
    });

    const handleSave = () => {
        // Convert drafts to final configs (treating '' as 0)
        const finalPrixM2 = toFinalConfig(localPrixM2);
        const finalPrixLogement = toFinalConfig(localPrixLogement);
        const finalM2Jour = toFinalConfig(localM2Jour);
        const finalLogementsJour = toFinalConfig(localLogementsJour);

        onSaveConfigs(
            { config: finalPrixM2, values: generateArray(finalPrixM2) },
            { config: finalPrixLogement, values: generateArray(finalPrixLogement) },
            { config: finalM2Jour, values: generateArray(finalM2Jour) },
            { config: finalLogementsJour, values: generateArray(finalLogementsJour) }
        );
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuration des Matrices</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Définissez les échelles de valeurs (Min / Max / Pas)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* SECTION 1: CIBLES DE PRIX */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                <TrendingUp className="w-4 h-4" />
                                Échelles de Prix Cibles (Lignes)
                            </h3>

                            <RangeInputGroup
                                label="Prix / m² Target"
                                config={localPrixM2}
                                onChange={setLocalPrixM2}
                                unit="€"
                            />

                            <RangeInputGroup
                                label="Prix / Logement Target"
                                config={localPrixLogement}
                                onChange={setLocalPrixLogement}
                                unit="€"
                            />
                        </div>

                        {/* SECTION 2: CADENCES */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                <Grid3X3 className="w-4 h-4" />
                                Échelles de Productivité (Colonnes)
                            </h3>

                            <RangeInputGroup
                                label="Cadence Surface"
                                config={localM2Jour}
                                onChange={setLocalM2Jour}
                                unit="m²/j"
                            />

                            <RangeInputGroup
                                label="Cadence Logements"
                                config={localLogementsJour}
                                onChange={setLocalLogementsJour}
                                unit="u/j"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 sticky bottom-0 z-10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors font-medium"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/20 transition-all transform hover:scale-105"
                    >
                        Appliquer la configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
