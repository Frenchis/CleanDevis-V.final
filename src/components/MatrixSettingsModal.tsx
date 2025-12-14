import React, { useState } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import { EyeCatchingButton_v2 } from './ui/shiny-button';

export interface RangeConfig {
    min: number;
    max: number;
    step: number;
}

interface MatrixSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;

    // Configurations
    prixM2Config: RangeConfig;
    m2JourConfig: RangeConfig;
    logementsJourConfig: RangeConfig;

    // Callbacks to save both config and generated arrays
    onSaveConfigs: (
        prixM2: { config: RangeConfig, values: number[] },
        m2Jour: { config: RangeConfig, values: number[] },
        logementsJour: { config: RangeConfig, values: number[] }
    ) => void;
}

const generateArray = (config: RangeConfig): number[] => {
    const { min, max, step } = config;
    if (step <= 0) return [];

    const count = Math.floor((max - min) / step) + 1;
    return Array.from({ length: count }, (_, i) => {
        const val = min + (i * step);
        return Math.round(val * 100) / 100; // Avoid floating point errors
    });
};

const RangeInputGroup = ({
    label,
    config,
    onChange
}: {
    label: string,
    config: RangeConfig,
    onChange: (c: RangeConfig) => void
}) => {
    const handleChange = (field: keyof RangeConfig, value: string) => {
        const num = parseFloat(value);
        if (isNaN(num)) return;
        onChange({ ...config, [field]: num });
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
            <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Min</label>
                    <input
                        type="number"
                        value={config.min}
                        onChange={(e) => handleChange('min', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Max</label>
                    <input
                        type="number"
                        value={config.max}
                        onChange={(e) => handleChange('max', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Incrément</label>
                    <input
                        type="number"
                        value={config.step}
                        onChange={(e) => handleChange('step', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    />
                </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
                Aperçu : {generateArray(config).slice(0, 5).join(', ')}... ({generateArray(config).length} valeurs)
            </div>
        </div>
    );
};

export const MatrixSettingsModal: React.FC<MatrixSettingsModalProps> = ({
    isOpen,
    onClose,
    prixM2Config,
    m2JourConfig,
    logementsJourConfig,
    onSaveConfigs,
}) => {
    const [localPrixM2, setLocalPrixM2] = useState<RangeConfig>(prixM2Config);
    const [localM2Jour, setLocalM2Jour] = useState<RangeConfig>(m2JourConfig);
    const [localLogementsJour, setLocalLogementsJour] = useState<RangeConfig>(logementsJourConfig);

    // Sync local state when modal opens
    // (In a real app, typically handled by useEffect on isOpen, 
    // but here we just rely on parent passing correct props which usually don't change while closed)
    // Actually, to support "Cancel", we should sync on open.
    // Let's use a key pattern on parent or useEffect here.
    React.useEffect(() => {
        if (isOpen) {
            setLocalPrixM2(prixM2Config);
            setLocalM2Jour(m2JourConfig);
            setLocalLogementsJour(logementsJourConfig);
        }
    }, [isOpen, prixM2Config, m2JourConfig, logementsJourConfig]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSaveConfigs(
            { config: localPrixM2, values: generateArray(localPrixM2) },
            { config: localM2Jour, values: generateArray(localM2Jour) },
            { config: localLogementsJour, values: generateArray(localLogementsJour) }
        );
        onClose();
    };

    const handleReset = () => {
        setLocalPrixM2({ min: 1, max: 4, step: 0.5 });
        setLocalM2Jour({ min: 200, max: 400, step: 100 });
        setLocalLogementsJour({ min: 5, max: 7, step: 1 });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Configuration des Matrices</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 overflow-y-auto">
                    <div className="bg-violet-50 dark:bg-violet-500/10 p-4 rounded-xl border border-violet-100 dark:border-violet-500/20">
                        <h4 className="font-bold text-violet-700 dark:text-violet-300 mb-2 text-sm flex items-center gap-2">
                            <RotateCcw className="w-3 h-3" />
                            Mode plage dynamique
                        </h4>
                        <p className="text-xs text-violet-600/80 dark:text-violet-300/80">
                            Définissez le minimum, maximum et l'intervalle pour générer automatiquement les colonnes et lignes.
                        </p>
                    </div>

                    <RangeInputGroup
                        label="Échelle Prix / m² (€)"
                        config={localPrixM2}
                        onChange={setLocalPrixM2}
                    />

                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                    <RangeInputGroup
                        label="Échelle Production Surface (m²/jour)"
                        config={localM2Jour}
                        onChange={setLocalM2Jour}
                    />

                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                    <RangeInputGroup
                        label="Échelle Production Logements (log/jour)"
                        config={localLogementsJour}
                        onChange={setLocalLogementsJour}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:underline"
                    >
                        Rétablir défauts
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
                        >
                            Annuler
                        </button>
                        <EyeCatchingButton_v2
                            onClick={handleSave}
                            className="bg-violet-600 shadow-violet-500/20 text-white"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Appliquer
                        </EyeCatchingButton_v2>
                    </div>
                </div>
            </div>
        </div>
    );
};
