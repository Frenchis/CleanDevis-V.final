import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import { Search, Calendar, User, ArrowRight, Filter, Download, Eye, Trash2, CloudLightning, Loader2 } from 'lucide-react';
import { createEstimate } from '../services/sellsyService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmModal';

export const History = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching quotes:", error);
        toast.error("Erreur lors du chargement de l'historique: " + error.message);
      } else if (data) {
        // Map Supabase data to ProjectData
        // The 'data' column in Supabase holds the JSON ProjectData
        // We might need to merge top-level fields if we want, but 'data' should have everything
        const mappedProjects = data.map((row: any) => row.data as ProjectData);
        setProjects(mappedProjects);
      }
    };

    fetchProjects();
  }, []);

  const handleLoadProject = (project: ProjectData) => {
    navigate('/devis', { state: { project: project } });
  };

  const handleExportSellsy = async (project: ProjectData) => {
    if (!project.sellsyClientId) {
      toast.error("Ce projet n'est pas lié à un client Sellsy.");
      return;
    }

    if (!await confirm({
      title: 'Export Sellsy',
      message: `Créer un devis Sellsy pour ${project.name} ?`,
      confirmText: 'Créer le devis',
      type: 'info'
    })) return;

    setExportingId(project.id);
    try {
      const estimateId = await createEstimate(project, project.sellsyClientId);
      toast.success(`Devis créé avec succès ! ID: ${estimateId}`);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création du devis.");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Historique des Devis</h2>
          <p className="text-slate-500 dark:text-slate-400">Retrouvez tous vos projets sauvegardés</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="py-4 px-6 font-medium">Projet</th>
                <th className="py-4 px-6 font-medium">Date</th>
                <th className="py-4 px-6 font-medium">Client</th>
                <th className="py-4 px-6 font-medium text-center">Logements</th>
                <th className="py-4 px-6 font-medium text-right">Montant HT</th>
                <th className="py-4 px-6 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Aucun devis enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">{project.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">{project.surfaceTotal} m² • {project.nbPhases} Phases</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 text-sm">
                      {new Date(project.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 text-sm">
                      {project.client}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold">
                        {project.nbLogements}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-brand-green">
                      {Math.round(project.selectedSolution?.priceFinal || 0).toLocaleString()} €
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleLoadProject(project)}
                          className="p-2 hover:bg-brand-blue/10 text-slate-400 hover:text-brand-blue rounded transition-colors"
                          title="Ouvrir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportSellsy(project)}
                          disabled={exportingId === project.id || !project.sellsyClientId}
                          className={`p-2 rounded transition-colors ${!project.sellsyClientId ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-500/10 text-slate-400 hover:text-blue-600'}`}
                          title="Exporter vers Sellsy"
                        >
                          {exportingId === project.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <CloudLightning className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm({
                              title: 'Supprimer le devis',
                              message: `Supprimer le devis "${project.name}" ?`,
                              confirmText: 'Supprimer',
                              type: 'danger'
                            })) {
                              const { error } = await supabase.from('quotes').delete().eq('id', project.id);
                              if (error) {
                                console.error("Error deleting quote:", error);
                                toast.error("Erreur lors de la suppression.");
                              } else {
                                setProjects(prev => prev.filter(p => p.id !== project.id));
                                toast.success("Devis supprimé");
                              }
                            }
                          }}
                          className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};