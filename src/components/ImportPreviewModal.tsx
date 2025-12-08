
import React, { useState, useEffect } from 'react';
import { ProjectData, TypologyCount, Phase } from '../types';
import { X, Check, Save } from 'lucide-react';

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<ProjectData>) => void;
    initialData: Partial<ProjectData> | null;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialData
}) => {
    const [data, setData] = useState<Partial<ProjectData> | null>(null);

    useEffect(() => {
        if (initialData) {
            setData(JSON.parse(JSON.stringify(initialData))); // Deep copy
        }
    }, [initialData]);

    if (!isOpen || !data) return null;

    const handleTypologyChange = (type: keyof TypologyCount, value: string) => {
        if (!data.typologies) return;
        const numValue = parseInt(value) || 0;
        setData({
            ...data,
            typologies: {
                ...data.typologies,
                [type]: numValue
            }
        });
    };

    const togglePhase = (phase: string) => {
        if (!data.activePhases) return;

        // Check if phase is present (handling both string and PhaseItem for safety)
        const isPresent = data.activePhases.some(p =>
            (typeof p === 'string' ? p === phase : p.type === phase)
        );

        let newPhases;
        if (isPresent) {
            // Remove all instances of this phase
            newPhases = data.activePhases.filter(p =>
                (typeof p === 'string' ? p !== phase : p.type !== phase)
            );
        } else {
            // Add new instance
            // Need UUID for PhaseItem
            const newItem = { id: crypto.randomUUID(), type: phase as Phase };
            newPhases = [...data.activePhases, newItem];
        }

        setData({ ...data, activePhases: newPhases as any, nbPhases: newPhases.length });
    };

    const allPhases = Object.values(Phase);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1A1D24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-emerald-400">⚡</span> Validation de l'import
                        </h2>
                        <p className="text-indigo-200/60 text-sm mt-1">Vérifiez les données extraites du devis Sellsy.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/50" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">

                    {/* Project Info */}
                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <label className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-1 block">Nom du Projet</label>
                            <input
                                type="text"
                                value={data.name || ''}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                className="w-full bg-transparent text-white font-medium focus:outline-none border-b border-transparent focus:border-indigo-500 transition-colors py-1"
                            />
                        </div>
                    </div>

                    {/* Phases Selection */}
                    <div>
                        <label className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-3 block">Phases Détectées</label>
                        <div className="grid grid-cols-2 gap-3">
                            {allPhases.map((phase) => {
                                // Count instances
                                const count = data.activePhases?.filter(p =>
                                    (typeof p === 'string' ? p === phase : p.type === phase)
                                ).length || 0;
                                const isActive = count > 0;

                                return (
                                    <div
                                        key={phase}
                                        onClick={() => togglePhase(phase)}
                                        className={`
                      cursor-pointer p-3 rounded-lg border transition-all duration-200 flex items-center justify-between
                      ${isActive
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                                            }
                    `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{phase}</span>
                                            {count > 1 && (
                                                <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">x{count}</span>
                                            )}
                                        </div>
                                        {isActive && <Check className="w-4 h-4 text-indigo-400" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Typologies */}
                    <div>
                        <label className="text-xs font-medium text-indigo-300 uppercase tracking-wider mb-3 block">Quantités (Typologies Globales)</label>
                        <div className="bg-white/5 rounded-xl border border-white/5 p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {data.typologies && Object.entries(data.typologies).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="text-xs text-white/40 block mb-1">{key}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={value}
                                            onChange={(e) => handleTypologyChange(key as keyof TypologyCount, e.target.value)}
                                            className="w-full bg-[#111318] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none transition-colors text-center font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium text-sm"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => onConfirm(data)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all font-medium text-sm flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Valider l'import
                    </button>
                </div>

            </div>
        </div>
    );
};
