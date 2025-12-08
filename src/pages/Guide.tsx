import React from 'react';
import {
    CloudLightning,
    Calculator,
    Save,
    Trash2,
    Plus,
    Check,
    ArrowRight,
    LayoutDashboard,
    FileText,
    Search,
    BookOpen,
    Info
} from 'lucide-react';

export const Guide: React.FC = () => {
    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-brand-green/10 rounded-2xl mb-4">
                    <BookOpen className="w-8 h-8 text-brand-green" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Guide d'Utilisation
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Tout ce qu'il faut savoir pour maîtriser la page Devis et l'intégration Sellsy.
                </p>
            </div>

            {/* Focus Devis */}
            <section className="space-y-8">

                {/* 1. L'Import Sellsy */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Search className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. L'Import Sellsy</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-600 dark:text-slate-300 leading-relaxed">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="bg-slate-100 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span>
                                Récupérer l'ID
                            </h3>
                            <p className="mb-4 text-sm">
                                L'import fonctionne avec l'Identifiant unique du devis Sellsy. Ce n'est <strong>pas</strong> la référence (ex: DEV-2024-001).
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                                <p className="font-semibold mb-2">Où le trouver ?</p>
                                <p>Dans l'URL de votre navigateur quand vous êtes sur le devis Sellsy :</p>
                                <code className="block mt-2 bg-white dark:bg-black p-2 rounded border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs">
                                    https://www.sellsy.com/estimates/<span className="font-bold underline decoration-wavy">123456</span>
                                </code>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="bg-slate-100 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span>
                                Validation
                            </h3>
                            <p className="text-sm mb-4">
                                Une fois l'ID saisi et le bouton "Importer" cliqué :
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Une fenêtre s'ouvre pour confirmer les données trouvées.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>C'est ici que vous vérifiez que toutes les phases (Vitrerie, OPR...) ont bien été détectées.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 2. Gestion des Phases */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">2. Gestion des Phases</h2>
                    </div>

                    <div className="space-y-6 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Ajouter & Doubler</h3>
                                <p className="text-sm">
                                    Le bloc "Phases Actives" en haut à droite vous permet de piloter la structure du devis.
                                </p>
                                <ul className="mt-4 space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Plus className="w-4 h-4 text-blue-500" />
                                        <span>Cliquez sur le petit <strong className="text-blue-500">+</strong> à côté d'une phase pour l'ajouter.</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="font-bold text-blue-500 px-2 py-0.5 bg-blue-100 rounded-full text-xs">x2</span>
                                        <span>Si vous cliquez plusieurs fois, vous créez des doublons (ex: 2 lignes distinctes "Vitrerie").</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                    Suppression
                                </h3>
                                <p className="text-sm">
                                    Pour supprimer une phase, ne cherchez pas en haut ! Allez directement dans le <strong>tableau détaillé</strong> en bas de page. Une icône poubelle est disponible à côté du nom de chaque phase pour la retirer individuellement.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Export & Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                            <CloudLightning className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3. Export & Finalisation</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Export Sellsy</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Le bouton "Export Sellsy" est intelligent :
                            </p>
                            <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                <li>• Si vous avez importé un devis (via ID) ➔ Il le <strong>met à jour</strong>.</li>
                                <li>• Sinon ➔ Il crée un <strong>nouveau devis</strong>.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Prix Cible</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Le prix affiché en gros ("Objectif Financier") est modifiable. Si vous le changez, l'outil recalcule automatiquement la ventilation pour atteindre ce montant exact.
                            </p>
                        </div>
                    </div>
                </div>

            </section>

            {/* Footer / Support */}
            <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Besoin d'aide ?</h2>
                        <p className="text-indigo-100 max-w-md">
                            Une question technique ou un bug à signaler ?
                        </p>
                    </div>
                    <div className="shrink-0 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                        <div className="text-sm font-medium mb-1 opacity-80">Support Technique</div>
                        <div className="font-bold text-lg">Julius le gars de l'IT</div>
                    </div>
                </div>
            </section>

        </div>
    );
};
