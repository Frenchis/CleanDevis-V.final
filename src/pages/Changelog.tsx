import React from 'react';
import { motion } from 'motion/react';
import { GitCommit, Calendar, ArrowLeft, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import changelogData from '../data/changelog.json';

// Helper to format date
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

export const Changelog = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500"
                        title="Retour"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Activity className="w-8 h-8 text-brand-blue" />
                            Journal des Modifications
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Suivi des mises à jour et améliorations de l'application
                        </p>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-6 md:ml-10 space-y-12">
                {changelogData.map((item, index) => (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={item.hash}
                        className="relative pl-8 md:pl-12"
                    >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-brand-dark border-4 border-brand-blue shadow-sm ring-4 ring-white dark:ring-brand-dark z-10 transition-transform hover:scale-125" />

                        {/* Content Card */}
                        <div className="group relative bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">

                            {/* Decorative Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none">
                                            {item.hash}
                                        </span>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                            {item.message.split(':')[0]}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(item.date)}
                                    </div>
                                </div>

                                <p className="text-slate-600 dark:text-slate-300 font-medium pl-1 border-l-2 border-slate-200 dark:border-slate-700/50 leading-relaxed">
                                    {item.message.split(':').slice(1).join(':').trim() || item.message}
                                </p>

                                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                                    <GitCommit className="w-3 h-3" />
                                    <span>Commit par <span className="font-semibold text-slate-600 dark:text-slate-300">{item.author}</span></span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
