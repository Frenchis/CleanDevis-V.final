import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { GitCommit, Calendar, ArrowLeft, Activity, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import changelogData from '../data/changelog.json';

// Helper to format date safely (Compact)
const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

export const Changelog = () => {
    const navigate = useNavigate();

    // Grouping logic could be added here, but for "compact", a clean list is best.
    const displayData = useMemo(() => changelogData, []);

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
            {/* COMPACT HEADER */}
            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all border border-slate-200 dark:border-slate-700 text-slate-500"
                        title="Retour"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-blue" />
                            Historique
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {displayData.length} dernières mises à jour
                        </p>
                    </div>
                </div>
            </div>

            {/* COMPACT TIMELINE */}
            <div className="relative border-l border-slate-200 dark:border-slate-700/50 ml-3 md:ml-4 space-y-4">
                {displayData.map((item, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 1) }} // Cap delay
                        key={item.hash}
                        className="relative pl-6 md:pl-8"
                    >
                        {/* Timeline Dot (Small) */}
                        <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-white dark:bg-brand-dark border-2 border-slate-300 dark:border-slate-600 group-hover:border-brand-blue transition-colors z-10" />

                        {/* Content Card (Compact) */}
                        <div className="group relative bg-white dark:bg-brand-card/40 hover:bg-slate-50 dark:hover:bg-brand-card/80 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3 px-4 shadow-sm hover:shadow-md transition-all duration-200">

                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-1">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                    {item.message.split(':')[0]}
                                </h3>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                                        {item.hash.substring(0, 7)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {formatDate(item.date)}
                                    </span>
                                </div>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-2 border-l-2 border-slate-100 dark:border-slate-700/50 mt-1">
                                {item.message.split(':').slice(1).join(':').trim() || "Mise à jour mineure"}
                            </div>

                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
