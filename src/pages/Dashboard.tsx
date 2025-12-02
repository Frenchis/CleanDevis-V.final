
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  History,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Loader2,
  Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ProjectData } from '../types';
import { motion } from 'motion/react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuotes: 0,
    totalAmount: 0,
    monthQuotes: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent quotes for the list
        const { data: recentQuotes, error: recentError } = await supabase
          .from('quotes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentError) throw recentError;

        // Fetch all quotes for stats (CA Potentiel)
        const { data: allQuotes, error: allError } = await supabase
          .from('quotes')
          .select('data');

        if (allError) throw allError;

        let mappedRecent: ProjectData[] = [];
        if (recentQuotes) {
          mappedRecent = recentQuotes.map((row: any) => row.data as ProjectData);
          setRecentProjects(mappedRecent);
        }

        if (allQuotes) {
          const mappedAll = allQuotes.map((row: any) => row.data as ProjectData);
          // Calculate total amount from ALL quotes
          const totalAmt = mappedAll.reduce((acc, curr) => acc + (curr.selectedSolution?.priceFinal || 0), 0);

          setStats({
            totalQuotes: mappedAll.length,
            totalAmount: totalAmt,
            monthQuotes: mappedRecent ? mappedRecent.length : 0 // Keeping this simple for now
          });
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tableau de Bord</h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/calculator')}
              className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-brand-blue/20 font-medium"
            >
              <Plus className="w-5 h-5" />
              Nouveau Devis
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-brand-green/10 text-brand-green rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                Pipe
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">CA Potentiel (Pipe)</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </h3>
          </motion.div>

          <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Devis Créés</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalQuotes}</h3>
          </motion.div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/calculator" className="group relative overflow-hidden bg-gradient-to-br from-brand-blue to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-brand-blue/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <div className="relative z-10">
              <div className="p-3 bg-white/20 w-fit rounded-xl mb-4 backdrop-blur-sm">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-1">Créer un Devis</h3>
              <p className="text-blue-100 text-sm">Lancer le calculateur intelligent</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity transform translate-x-4 translate-y-4">
              <Plus className="w-32 h-32" />
            </div>
          </Link>

          <Link to="/templates" className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-brand-blue/50 hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 w-fit rounded-xl mb-4 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
              <FileText className="w-6 h-6 text-slate-600 dark:text-slate-300 group-hover:text-brand-blue" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Mes Modèles</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gérer les templates réutilisables</p>
          </Link>

          <Link to="/history" className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-brand-blue/50 hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 w-fit rounded-xl mb-4 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
              <History className="w-6 h-6 text-slate-600 dark:text-slate-300 group-hover:text-brand-blue" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Historique</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Consulter les devis passés</p>
          </Link>

          <Link to="/settings" className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-brand-blue/50 hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 w-fit rounded-xl mb-4 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
              <Settings className="w-6 h-6 text-slate-600 dark:text-slate-300 group-hover:text-brand-blue" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Configuration</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Paramètres globaux et Sellsy</p>
          </Link>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activité Récente</h3>
            <Link to="/history" className="text-sm text-brand-blue hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Aucune activité récente.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentProjects.map((project) => (
                <div key={project.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-sm">
                      {project.client.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{project.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {project.client} • {new Date(project.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {Math.round(project.selectedSolution?.priceFinal || 0).toLocaleString()} €
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {project.nbLogements} Logements
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/devis', { state: { project } })}
                      className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
