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
    BookOpen
} from 'lucide-react';

export const Guide: React.FC = () => {
    return (
        <div className="space-y-12 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-brand-green/10 rounded-2xl mb-4">
                    <BookOpen className="w-8 h-8 text-brand-green" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Guide d'Utilisation
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Maîtrisez toutes les subtilités de CleanDevis, de l'import Sellsy à la génération finale.
                </p>
            </div>

            {/* 1. Workflow Global */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 text-sm font-bold">1</div>
                    Le Workflow Idéal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Search className="w-24 h-24" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">1. Import / Calcul</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Commencez soit par importer un devis Sellsy existant pour le mettre à jour, soit par définir vos paramètres dans le Calculateur.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <LayoutDashboard className="w-24 h-24" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">2. Ventilation (Devis)</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Ajustez les phases, ajoutez des doublons (ex: 2x Vitrerie), modifiez les prix unitaires et affinez la répartition par typologie.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CloudLightning className="w-24 h-24" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">3. Export Sellsy</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Envoyez le résultat final vers Sellsy. Si vous avez importé un devis, il sera mis à jour. Sinon, un nouveau devis sera créé.
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. Focus Devis */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-sm font-bold">2</div>
                    Focus : La Page Devis
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    C'est ici que toute la magie opère. Voici comment maîtriser l'interface.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Headers & Actions */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <CloudLightning className="w-6 h-6 text-blue-500" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Actions Principales</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0"><Search className="w-4 h-4" /></div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Importer Sellsy</h4>
                                    <p className="text-xs text-slate-500 mt-1">Collez l'ID d'un devis (ex: `123456`) pour récupérer client, prix total et phases. Une pop-up vous permettra de valider les données.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0 text-blue-600"><CloudLightning className="w-4 h-4" /></div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Export Sellsy</h4>
                                    <p className="text-xs text-slate-500 mt-1">Crée ou met à jour le devis sur Sellsy. Si vous avez importé un devis, c'est une <strong>mise à jour</strong>. Sinon, c'est une <strong>création</strong>.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gestion des Phases */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <Check className="w-6 h-6 text-purple-500" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gestion des Phases</h3>
                        </div>
                        <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                            <li className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-emerald-500" />
                                <span>Utilisez le bouton <strong>+</strong> dans le bloc "Phases Actives" pour ajouter une phase.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="font-bold text-blue-500 px-2 py-0.5 bg-blue-100 rounded-full text-xs">x2</span>
                                <span>Vous pouvez ajouter <strong>plusieurs fois</strong> la même phase (ex: 2x Vitrerie).</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>Pour supprimer une phase spécifique, utilisez l'icône poubelle dans le <strong>tableau détaillé</strong> en bas de page.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Grille Tarifaire */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-lg md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <FileText className="w-6 h-6 text-brand-green" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">La Grille Tarifaire</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Mode Calcul (Typologies)</h4>
                                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                    Si vous avez défini des quantités (ex: 10 T2, 5 T3), le tableau vous permet d'ajuster le <strong>Prix Unitaire</strong> de chaque typologie pour chaque phase.
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <code className="text-xs text-slate-600 dark:text-slate-400">Total Phase = (Qté T2 x PU T2) + (Qté T3 x PU T3)...</code>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Mode Manuel (Surface/Global)</h4>
                                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                    Si vous n'avez pas de typologies, vous définissez simplement le <strong>Montant Forfaitaire</strong> pour chaque phase.
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <code className="text-xs text-slate-600 dark:text-slate-400">Total Phase = Montant Forfaitaire Saisi</code>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* 3. Astuces */}
            <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Le Saviez-vous ?</h2>
                        <ul className="space-y-2 text-indigo-100">
                            <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-300" />
                                <span>Le "Prix Cible" en haut à gauche recalcule automatiquement toute la répartition si vous le modifiez.</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-300" />
                                <span>Vous pouvez effacer tout le devis avec le bouton rouge "Effacer" pour repartir de zéro.</span>
                            </li>
                        </ul>
                    </div>
                    <div className="shrink-0 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                        <div className="text-sm font-medium mb-1 opacity-80">Support Technique</div>
                        <div className="font-bold text-lg">jules@cleandevis.fr</div>
                    </div>
                </div>
            </section>

        </div>
    );
};
