import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw, Save } from 'lucide-react';
import { EyeCatchingButton_v2 } from './ui/shiny-button';

interface MatrixSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;

    // Arrays state
    prixM2Values: number[];
    setPrixM2Values: (vals: number[]) => void;

    m2JourValues: number[];
    setM2JourValues: (vals: number[]) => void;

    logementsJourValues: number[];
    setLogementsJourValues: (vals: number[]) => void;
}

export const MatrixSettingsModal: React.FC<MatrixSettingsModalProps> = ({
    isOpen,
    onClose,
    prixM2Values,
    setPrixM2Values,
    m2JourValues,
    setM2JourValues,
    logementsJourValues,
    setLogementsJourValues,
}) => {
    // Local state for editing before save? 
    // For simplicity, we can edit directly or use local state. 
    // Let's use local state to allow "Cancel".
    const [localPrixM2, setLocalPrixM2] = useState<string>(prixM2Values.join(', '));
    const [localM2Jour, setLocalM2Jour] = useState<string>(m2JourValues.join(', '));
    const [localLogementsJour, setLocalLogementsJour] = useState<string>(logementsJourValues.join(', '));

    if (!isOpen) return null;

    const handleSave = () => {
        // Parse strings back to number arrays
        const parsArray = (str: string) => str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);

        setPrixM2Values(parsArray(localPrixM2));
        setM2JourValues(parsArray(localM2Jour));
        setLogementsJourValues(parsArray(localLogementsJour));
        onClose();
    };

    const handleReset = () => {
        setLocalPrixM2("1, 1.5, 2, 2.5, 3, 3.5, 4");
        setLocalM2Jour("200, 300, 400");
        setLocalLogementsJour("5, 6, 7");
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
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="bg-violet-50 dark:bg-violet-500/10 p-4 rounded-xl border border-violet-100 dark:border-violet-500/20">
                            <h4 className="font-bold text-violet-700 dark:text-violet-300 mb-2 text-sm flex items-center gap-2">
                                <RotateCcw className="w-3 h-3" />
                                Format attendu
                            </h4>
                            <p className="text-xs text-violet-600/80 dark:text-violet-300/80">
                                Séparez les valeurs par des virgules. Ex: <code>1, 1.5, 2</code>. Les valeurs seront automatiquement triées.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Échelle Prix / m² (€)
                            </label>
                            <input
                                type="text"
                                value={localPrixM2}
                                onChange={(e) => setLocalPrixM2(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Échelle Production Surface (m²/jour)
                            </label>
                            <input
                                type="text"
                                value={localM2Jour}
                                onChange={(e) => setLocalM2Jour(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Échelle Production Logements (log/jour)
                            </label>
                            <input
                                type="text"
                                value={localLogementsJour}
                                onChange={(e) => setLocalLogementsJour(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                    </div>
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
                            Enregistrer
                        </EyeCatchingButton_v2>
                    </div>
                </div>
            </div>
        </div>
    );
};
