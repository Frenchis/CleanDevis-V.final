import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ProjectData, BreakdownItem, TypologyCount, SellsyClient } from '../types';
import { calculateBreakdown, getStandardPhases, PHASE_WEIGHTS } from '../services/calculationService';
import { ClientSearch } from '../components/ClientSearch';
import { EyeCatchingButton_v2 } from '../components/ui/shiny-button';
import { IosCheckbox } from '../components/ui/ios-checkbox';
import gsap from 'gsap';

import { createEstimate, updateEstimate } from '../services/sellsyService';
import { supabase } from '../lib/supabaseClient';
import { Download, ArrowLeft, Save, RefreshCw, CheckCircle, AlertTriangle, Building2, Trash2, CloudLightning, Loader2, Search } from 'lucide-react';
import { ImportPreviewModal } from '../components/ImportPreviewModal';

const DEFAULT_TYPOLOGIES: TypologyCount = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, Autre: 0 };
const COLORS = ['#4D9805', '#2F3388', '#0ea5e9', '#6366f1'];

import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmModal';
import { RichTextTextarea } from '../components/ui/RichTextTextarea';

export const Devis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  // -- State --
  // We now maintain local state for typologies and phases to allow standalone usage
  const [typologies, setTypologies] = useState<TypologyCount>(DEFAULT_TYPOLOGIES);
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [activePhases, setActivePhases] = useState<string[]>([]); // Default for standalone
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [projectName, setProjectName] = useState<string>("Nouveau Projet");
  const [subject, setSubject] = useState<string>("");

  const [isInitialized, setIsInitialized] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // New state for import loading
  const [importSellsyId, setImportSellsyId] = useState<string>(""); // New state for input
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  // Import Validation State
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<Partial<ProjectData> | null>(null);

  // Import Service
  // Note: We need to dynamically import or standard import. Standard is fine.
  // But wait, the file is recently created.



  // -- Handlers --

  const handleImportSellsy = async () => {
    if (!importSellsyId) {
      toast.error("Veuillez saisir un ID de devis Sellsy");
      return;
    }

    setIsImporting(true);
    try {
      // Dynamic import to avoid issues if service has complex deps loaded early
      const { importEstimateFromSellsy } = await import('../services/sellsyImportService');

      // Clean ID input
      const cleanId = importSellsyId.trim();
      let id = parseInt(cleanId);

      // Support raw text "DEV-XXXX" searching if we implement search by ref later
      // For now, strict ID parsing
      if (isNaN(id)) throw new Error("ID Sellsy invalide (doit être numérique)");

      const importedData = await importEstimateFromSellsy(id);

      if (importedData) {
        setPendingImportData(importedData);
        setShowImportModal(true);
      } else {
        toast.error("Impossible de récupérer les données du devis");
      }
    } catch (error: any) {
      console.error("Import failed", error);
      toast.error("Erreur import: " + (error.message || "Erreur inconnue"));
    } finally {
      setIsImporting(false);
    }
  };

  const confirmImport = (data: Partial<ProjectData>) => {
    if (data.typologies) setTypologies(data.typologies);
    if (data.activePhases) setActivePhases(data.activePhases);
    if (data.name) setProjectName(data.name);

    // Reset surface area as we use typologies
    setSurfaceArea(0);

    // Close Modal
    setShowImportModal(false);
    setPendingImportData(null);

    toast.success("Données importées validées !");
  };

  // -- GSAP Animations --
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered entrance for bento items
      gsap.from(".bento-item", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
      });

      // Hover effect for bento items
      const items = document.querySelectorAll(".bento-item");
      items.forEach((item) => {
        item.addEventListener("mouseenter", () => {
          gsap.to(item, { scale: 1.02, duration: 0.3, ease: "power2.out" });
        });
        item.addEventListener("mouseleave", () => {
          gsap.to(item, { scale: 1, duration: 0.3, ease: "power2.out" });
        });
      });
    });

    return () => ctx.revert();
  }, []);

  // -- Initialization --
  useEffect(() => {
    if (location.state?.project) {
      const proj = location.state.project as ProjectData;
      setProjectData(proj);
      setProjectName(proj.name);
      setSubject(proj.subject || proj.name); // Default subject to name if empty
      setTypologies(proj.typologies);

      // If we have a calculated price, use it as target
      if (proj.selectedSolution) {
        setTargetPrice(Math.round(proj.selectedSolution.priceFinal));
      }

      if (proj.activePhases && proj.activePhases.length > 0) {
        setActivePhases(proj.activePhases);
      } else {
        const stdPhases = getStandardPhases(proj.nbPhases);
        setActivePhases(stdPhases);
      }
    } else {
      // Try to load from localStorage
      const savedData = localStorage.getItem('devis_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.typologies) setTypologies(parsed.typologies);
          if (parsed.activePhases) setActivePhases(parsed.activePhases);
          if (parsed.targetPrice) setTargetPrice(parsed.targetPrice);
          if (parsed.projectName) setProjectName(parsed.projectName);
          if (parsed.subject) setSubject(parsed.subject);
          if (parsed.projectData) setProjectData(parsed.projectData);
        } catch (e) {
          console.error("Failed to parse saved devis data", e);
        }
      }
    }
    setIsInitialized(true);
  }, [location]);

  // -- Persistence --
  // Auto-save removed in favor of manual save to Supabase
  // useEffect(() => { ... }, ...);

  // -- Calculation Effect --
  // Triggered whenever inputs change (Target, Phases, Typologies)
  useEffect(() => {
    // We only calculate if we have a target price and active phases
    if (targetPrice > 0 && activePhases.length > 0) {

      const totalUnits = (Object.values(typologies) as number[]).reduce((a, b) => a + b, 0);

      // Calculate breakdown even if totalUnits is 0 (Global mode)
      const bd = calculateBreakdown(targetPrice, typologies, activePhases);
      setBreakdown(bd);

      // Calculate effective total (Verification)
      let total = 0;
      bd.forEach(phase => {
        if (totalUnits > 0) {
          (Object.entries(typologies) as [string, number][]).forEach(([type, count]) => {
            total += (phase.typologies[type] || 0) * count;
          });
        } else {
          // In global mode, we just sum the phase totals
          total += phase.totalPhase;
        }
      });
      setCalculatedTotal(total);

    } else {
      setBreakdown([]);
      setCalculatedTotal(0);
    }
  }, [targetPrice, activePhases, typologies]);

  // -- Handlers --

  const PHASE_ORDER = ['Vitrerie', 'OPR', 'Pré-livraison', 'Livraison'];

  const handleAddPhase = (phase: string) => {
    setActivePhases(prev => {
      const newPhases = [...prev, phase];
      return newPhases.sort((a, b) => {
        return PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b);
      });
    });
  };

  const handleRemovePhase = (phase: string) => {
    setActivePhases(prev => {
      const index = prev.lastIndexOf(phase);
      if (index === -1) return prev;

      const newPhases = [...prev];
      newPhases.splice(index, 1);
      return newPhases;
    });
  };

  const handleTypologyChange = (key: keyof TypologyCount, value: number) => {
    setTypologies(prev => ({
      ...prev,
      [key]: Math.max(0, value)
    }));
  };

  const handleUnitPriceChange = (id: string, type: string, newVal: number) => {
    const newBreakdown = breakdown.map(item => {
      if (item.id === id) {
        const newTypos = { ...item.typologies, [type]: newVal };

        // Recalculate phase total
        let newPhaseTotal = 0;
        (Object.entries(typologies) as [string, number][]).forEach(([t, count]) => {
          newPhaseTotal += (newTypos[t] || 0) * count;
        });

        return { ...item, typologies: newTypos, totalPhase: newPhaseTotal };
      }
      return item;
    });

    setBreakdown(newBreakdown);

    // Update global Calculated Total
    let total = 0;
    newBreakdown.forEach(phase => {
      total += phase.totalPhase;
    });
    setCalculatedTotal(total);
  };

  const handleGlobalPhaseChange = (id: string, newVal: number) => {
    const newBreakdown = breakdown.map(item => {
      if (item.id === id) {
        return { ...item, totalPhase: newVal };
      }
      return item;
    });

    setBreakdown(newBreakdown);

    // Update global Calculated Total
    let total = 0;
    newBreakdown.forEach(phase => {
      total += phase.totalPhase;
    });
    setCalculatedTotal(total);
  };

  const handleClear = async () => {
    if (await confirm({
      title: 'Effacer le devis',
      message: "Êtes-vous sûr de vouloir tout effacer ?",
      confirmText: 'Effacer',
      type: 'danger'
    })) {
      setTargetPrice(0);
      setTypologies(DEFAULT_TYPOLOGIES);
      setSurfaceArea(0);
      setActivePhases([]);
      setBreakdown([]);
      setCalculatedTotal(0);
      setProjectName("Nouveau Projet");
      setSubject("");
    }
  };

  const handleSave = async () => {
    if (!projectData) {
      toast.error("Erreur : Données du projet manquantes.");
      return;
    }

    // Helper to check if string is UUID
    const isUUID = (str: string) => {
      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return regex.test(str);
    };

    let targetId = projectData.id;
    let isNew = false;

    // If ID is not a UUID (legacy timestamp), generate a new one
    if (!isUUID(targetId)) {
      targetId = crypto.randomUUID();
      isNew = true;
    }

    const updatedProjectData: ProjectData = {
      ...projectData,
      id: targetId,
      name: projectName,
      subject: subject || projectName,
      typologies: typologies,
      surfaceArea: surfaceArea,
      activePhases: activePhases,
      complexity: projectData.complexity,
      selectedSolution: {
        ...projectData.selectedSolution!,
        priceFinal: calculatedTotal
      },
      nbLogements: totalLogements,
      surfaceTotal: projectData.surfaceTotal,
      nbPhases: activePhases.length
    };

    try {
      // Use upsert to handle both insert and update in one go
      const { error } = await supabase
        .from('quotes')
        .upsert({
          id: targetId,
          name: projectName,
          client_name: updatedProjectData.client,
          data: updatedProjectData,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      if (isNew) {
        toast.success("Nouveau devis créé avec succès (migration depuis l'ancien format) !");
      } else {
        toast.success("Devis sauvegardé avec succès !");
      }

      setProjectData(updatedProjectData);

    } catch (e: any) {
      console.error("Exception saving quote:", e);
      toast.error(`Erreur lors de la sauvegarde : ${e.message || e.details || "Erreur inconnue"}`);
    }
  };

  const handleExportSellsy = async () => {
    if (!projectData?.sellsyClientId) {
      toast.error("Erreur : Aucun client Sellsy associé à ce projet. Veuillez retourner au calculateur pour sélectionner un client.");
      return;
    }

    const isUpdate = !!importSellsyId;
    const actionText = isUpdate ? 'Mettre à jour le devis' : 'Créer le devis';
    const msg = isUpdate
      ? `Voulez-vous METTRE À JOUR le devis Sellsy #${importSellsyId} ?`
      : `Voulez-vous créer un nouveau devis Sellsy pour ${projectName} ?`;

    if (!await confirm({
      title: 'Export Sellsy',
      message: msg,
      confirmText: actionText,
      type: 'info'
    })) return;

    setIsExporting(true);
    try {
      // Reconstruct project data with current ventilation state if needed
      // For now we use the initial project data but we should ideally update it with current breakdown
      // But createEstimate uses typologies and phases from project data.
      // Let's update projectData with current local state before sending
      // Calculate total apartments from current typologies
      const totalApartments = (Object.values(typologies) as number[]).reduce((sum, count) => sum + count, 0);

      const currentProject: ProjectData = {
        ...projectData,
        typologies: typologies,
        nbPhases: activePhases.length,
        activePhases: activePhases, // FIX: Pass current active phases (including duplicates)
        nbLogements: totalApartments, // Update with current total
        surfaceArea: surfaceArea, // Update with current surface area
        subject: subject || projectName
      };

      // We need to pass the current solution price if we want it to match exactly?
      // createEstimate uses `project.selectedSolution.priceFinal`.
      // If we changed quantities, the price changed.
      // We should update the selectedSolution in the project object passed.
      // Ensure selectedSolution exists
      if (!currentProject.selectedSolution) {
        currentProject.selectedSolution = {
          id: 'manual',
          priceRaw: calculatedTotal,
          priceFinal: calculatedTotal,
          convergenceScore: 0,
          days: 0,
          methods: [],
          explanation: 'Saisie manuelle',
          range: { min: calculatedTotal, max: calculatedTotal }
        };
      } else {
        currentProject.selectedSolution.priceFinal = calculatedTotal;
      }

      let result;

      if (isUpdate) {
        result = await updateEstimate(parseInt(importSellsyId), currentProject, projectData.sellsyClientId);
      } else {
        result = await createEstimate(currentProject, projectData.sellsyClientId);
      }

      if (result) {
        // If it was a creation, we might want to set the importID to this new ID so subsequent saves are updates?
        // But user flow might expect separate quotes. Let's keep it simple.
        // If we want to switch to "linked" mode after creation:
        if (!isUpdate) setImportSellsyId(result.id.toString());

        const backOfficeLink = `https://www.sellsy.com/?_f=estimateOverview&id=${result.id}&contextId=saleestimates_692cb8424256c`;
        toast.success(isUpdate ? "Devis mis à jour avec succès !" : `Devis créé avec succès ! ID: ${result.id}`);
        window.open(backOfficeLink, '_blank');
      } else {
        throw new Error("Pas de réponse de Sellsy");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création du devis Sellsy.");
    } finally {
      setIsExporting(false);
    }
  };

  // -- Visual Data --
  const pieData = breakdown.map(item => ({
    name: item.phase,
    value: item.totalPhase
  }));

  const diff = calculatedTotal - targetPrice;
  const isDiffSignificant = Math.abs(diff) > 5;
  const totalLogements = (Object.values(typologies) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-[1600px] mx-auto pb-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/calculator')}
            className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500"
            title="Retour au calculateur"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Devis</h2>
              {totalLogements === 0 && (
                <span className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-bold border border-yellow-500/20">
                  Mode Saisie
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {projectName} • Répartition par phase et typologie
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Effacer</span>
          </button>
          <EyeCatchingButton_v2
            onClick={handleExportSellsy}
            disabled={isExporting}
            className="text-white shadow-blue-600/20 border-blue-500 bg-[linear-gradient(110deg,#2563eb,45%,#60a5fa,55%,#2563eb)] dark:bg-[linear-gradient(110deg,#2563eb,45%,#60a5fa,55%,#2563eb)] dark:border-blue-500 dark:text-white"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudLightning className="w-4 h-4" />}
            <span className="hidden sm:inline">Export Sellsy</span>
          </EyeCatchingButton_v2>
          <EyeCatchingButton_v2
            onClick={handleSave}
            className="text-white shadow-brand-green/20 border-brand-green bg-[linear-gradient(110deg,#4D9805,45%,#65c206,55%,#4D9805)] dark:bg-[linear-gradient(110deg,#4D9805,45%,#60a5fa,55%,#4D9805)] dark:border-brand-green dark:text-white"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Enregistrer</span>
          </EyeCatchingButton_v2>
        </div>
      </div>


      {/* Search Input Row (New Location) */}
      <div className="mb-8 flex justify-center">
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 max-w-xl w-full">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Importer depuis Sellsy (ID du devis)"
            className="bg-transparent text-slate-900 dark:text-white flex-grow outline-none font-medium placeholder:font-normal"
            value={importSellsyId}
            onChange={(e) => setImportSellsyId(e.target.value)}
          />
          <EyeCatchingButton_v2
            onClick={handleImportSellsy}
            disabled={isImporting || !importSellsyId}
            className="py-2 px-4 text-xs"
          >
            {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Importer"}
          </EyeCatchingButton_v2>
        </div>
      </div>

      <ImportPreviewModal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setPendingImportData(null); }}
        onConfirm={confirmImport}
        initialData={pendingImportData}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">

        {/* 1. OBJECTIF FINANCIER (Top Left) - 4 cols */}
        <div className="bento-item md:col-span-4 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
          <div className="flex items-center gap-3 text-brand-green mb-4">
            <div className="p-2 bg-brand-green/10 rounded-xl">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Objectif Financier</h3>
          </div>

          <div className="space-y-6 flex-grow">
            {/* Client Search Integration */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
              <ClientSearch
                initialValue=""
                clearOnSelect={true}
                onSelect={(client) => {
                  if (typeof client === 'string') {
                    // Handle text input if needed
                  } else {
                    // Update project data with selected client
                    setProjectData(prev => {
                      const base = prev || {
                        id: crypto.randomUUID(),
                        name: projectName,
                        date: new Date().toISOString(),
                        client: "",
                        nbLogements: 0,
                        surfaceTotal: 0,
                        nbPhases: 0,
                        typologies: DEFAULT_TYPOLOGIES,
                        activePhases: [],
                        complexity: { distance: 0, finition: 0, accessibilite: 0, etat: 0 },
                        selectedSolution: null
                      };

                      return {
                        ...base,
                        client: client.name,
                        sellsyClientId: client.id,
                        sellsyClientType: client.type === 'corporation' ? 'company' : 'individual'
                      };
                    });
                  }
                }}
              />
              {projectData?.client && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-brand-green" />
                  Client sélectionné : <span className="font-bold text-slate-700 dark:text-slate-300">{projectData.client}</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <RichTextTextarea
                label="Objet du Devis"
                value={subject}
                onChangeValue={setSubject}
                placeholder="Ex: Nettoyage de fin de chantier - Résidence Les Fleurs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prix Global Cible (€ HT)</label>
              <input
                type="number"
                value={targetPrice || ''}
                placeholder="0"
                onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-brand-green/30 rounded-2xl px-4 py-4 text-3xl font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all placeholder-slate-300 dark:placeholder-slate-700"
              />
            </div>

            <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Calculé</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(calculatedTotal).toLocaleString()} €</span>
              </div>
              {isDiffSignificant ? (
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm flex items-center gap-2 text-yellow-500 font-medium">
                    <AlertTriangle className="w-4 h-4" /> Écart
                  </span>
                  <span className={`font-mono font-bold ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString()} €
                  </span>
                </div>
              ) : (
                targetPrice > 0 && (
                  <div className="flex items-center justify-end gap-2 text-emerald-400 text-sm font-bold pt-2">
                    <CheckCircle className="w-4 h-4" /> Équilibré
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 2. QUANTITÉS (Top Middle) - 4 cols */}
        <div className="bento-item md:col-span-4 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-brand-blue">
              <div className="p-2 bg-brand-blue/10 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">Quantités</h3>
            </div>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-bold font-mono border border-slate-200 dark:border-slate-700">
              Total: {totalLogements}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.keys(DEFAULT_TYPOLOGIES).map((key) => (
              <div key={key} className={`bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border flex flex-col items-center transition-all ${surfaceArea > 0 ? 'opacity-50 grayscale' : 'border-slate-100 dark:border-slate-700'}`}>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">{key}</label>
                <input
                  type="number"
                  min="0"
                  value={typologies[key as keyof TypologyCount] || ''}
                  placeholder="0"
                  disabled={surfaceArea > 0}
                  onChange={(e) => handleTypologyChange(key as keyof TypologyCount, parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-white text-center outline-none disabled:cursor-not-allowed"
                />
              </div>
            ))}

            {/* Separator */}
            <div className="col-span-2 flex items-center gap-4 py-2">
              <div className="h-px flex-grow bg-slate-200 dark:bg-slate-700"></div>
              <span className="text-xs font-bold text-slate-400 uppercase">OU PAR SURFACE</span>
              <div className="h-px flex-grow bg-slate-200 dark:bg-slate-700"></div>
            </div>

            {/* Surface Area Input */}
            <div className={`col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border flex flex-col items-center transition-all ${totalLogements > 0 ? 'opacity-50 grayscale' : 'border-brand-blue/30 bg-brand-blue/5'}`}>
              <label className="text-[10px] font-bold text-brand-blue uppercase mb-1">Surface Globale (m²)</label>
              <input
                type="number"
                min="0"
                value={surfaceArea || ''}
                placeholder="0"
                disabled={totalLogements > 0}
                onChange={(e) => setSurfaceArea(parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-2xl font-bold text-brand-blue text-center outline-none disabled:cursor-not-allowed"
              />
              {totalLogements > 0 && (
                <span className="text-[10px] text-red-400 mt-1">Désactivé car des typologies sont définies</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. PHASES (Top Right) - 4 cols */}
        <div className="bento-item md:col-span-4 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-3 text-purple-500 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <CloudLightning className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white">Phases Actives</h3>
          </div>

          <div className="space-y-2">
            {Object.keys(PHASE_WEIGHTS).map((phase) => {
              const count = activePhases.filter(p => p === phase).length;
              return (
                <div key={phase} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${count > 0 ? 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-sm' : 'bg-slate-50/30 dark:bg-slate-800/30 border-transparent opacity-60 hover:opacity-100'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{phase}</span>
                    {count > 0 && (
                      <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                        x{count}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-200 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-1 rounded mr-2">
                      Coef. {PHASE_WEIGHTS[phase as keyof typeof PHASE_WEIGHTS]}
                    </span>
                    <button
                      onClick={() => handleRemovePhase(phase)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${count > 0 ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                      disabled={count === 0}
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleAddPhase(phase)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. GRILLE TARIFAIRE (Bottom) - 12 cols */}
        <div className="bento-item md:col-span-12 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Grille Tarifaire Détaillée</h3>
            <span className="text-xs text-brand-green bg-brand-green/10 px-3 py-1 rounded-full border border-brand-green/20 font-medium">
              Prix unitaires modifiables
            </span>
          </div>

          {breakdown.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar flex-grow">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-4 px-4 font-bold">Phase</th>
                    {totalLogements > 0 ? (
                      (Object.entries(typologies) as [string, number][]).map(([t, c]) => c > 0 && (
                        <th key={t} className="py-4 px-2 font-bold text-center min-w-[100px]">
                          {t} <span className="text-[10px] text-slate-400 dark:text-slate-600 block normal-case">x{c}</span>
                        </th>
                      ))
                    ) : (
                      <th className="py-4 px-2 font-bold text-center">Global / Forfait</th>
                    )}
                    <th className="py-4 px-4 font-bold text-right">S/Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {breakdown.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{item.phase}</span>
                        </div>
                      </td>
                      {totalLogements > 0 ? (
                        (Object.entries(typologies) as [string, number][]).map(([t, c]) => c > 0 && (
                          <td key={t} className="py-2 px-2 text-center">
                            <div className="relative group inline-block">
                              <input
                                type="number"
                                className="w-32 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-right text-slate-900 dark:text-slate-200 font-mono focus:bg-white dark:focus:bg-slate-800 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                value={item.typologies[t] ? Number(item.typologies[t]).toFixed(2) : 0}
                                onChange={(e) => handleUnitPriceChange(item.id, t, parseFloat(e.target.value) || 0)}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">€</span>
                            </div>
                          </td>
                        ))
                      ) : (
                        <td className="py-2 px-2 text-center">
                          <div className="relative group max-w-[200px] mx-auto">
                            <input
                              type="number"
                              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-right text-slate-900 dark:text-slate-200 font-mono focus:bg-white dark:focus:bg-slate-800 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                              value={Math.round(item.totalPhase)}
                              onChange={(e) => handleGlobalPhaseChange(item.id, parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none">€</span>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-4 text-right font-bold text-brand-green">
                        {Math.round(item.totalPhase).toLocaleString()} €
                      </td>
                    </tr>
                  ))}

                  {/* Total Row */}
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <td className="py-4 px-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">TOTAL</td>
                    {totalLogements > 0 ? (
                      (Object.entries(typologies) as [string, number][]).map(([t, c]) => c > 0 && (
                        <td key={t} className="py-4 px-2 text-center font-bold text-slate-300 dark:text-slate-600 font-mono">
                          -
                        </td>
                      ))
                    ) : (
                      <td className="py-4 px-2 text-center font-bold text-slate-300 dark:text-slate-600 font-mono">
                        -
                      </td>
                    )}
                    <td className="py-4 px-4 text-right font-black text-xl text-slate-900 dark:text-white">
                      {Math.round(calculatedTotal).toLocaleString()} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-slate-400 italic">
              Aucune donnée à afficher. Veuillez définir un prix cible.
            </div>
          )}
        </div>

      </div>
    </div>

  );
};