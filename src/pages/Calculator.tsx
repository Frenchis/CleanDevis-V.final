
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { Sliders, Calculator as CalcIcon, AlertCircle, ArrowRight, Save, Info, TrendingUp, TrendingDown, Grid3X3 } from 'lucide-react';
import gsap from 'gsap';
import { ProjectData, TypologyCount, ComplexityParams, Solution, Phase, PhaseItem } from '../types';
import { findConvergentSolutions, calculateComplexityMultiplier } from '../services/calculationService';

import { searchClients, createOpportunity } from '../services/sellsyService';
import { SellsyClient } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Search, User, Check, Loader2 } from 'lucide-react';
import { Input } from '../components/Input';
import { ClientSearch } from '../components/ClientSearch';
import { EyeCatchingButton_v2 } from '../components/ui/shiny-button';
import { useToast } from '../components/ui/Toast';

const RangeSlider = ({ label, value, onChange, min, max, unit, color = "accent-brand-green" }: any) => (
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <span className="text-sm font-bold text-brand-green">{value > 0 ? `+${value}%` : '0%'} {unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${color}`}
    />
  </div>
);



export const Calculator = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // State
  const [nbLogements, setNbLogements] = useState<number>(15);
  const [surface, setSurface] = useState<number>(1500);
  const [phases, setPhases] = useState<number>(3);
  const [client, setClient] = useState<SellsyClient | null>(null);
  const [clientName, setClientName] = useState<string>(''); // For free text or display
  const [projectName, setProjectName] = useState<string>('');

  const [typologies, setTypologies] = useState<TypologyCount>({
    T1: 0, T2: 5, T3: 5, T4: 5, T5: 0, Autre: 0
  });

  const [complexity, setComplexity] = useState<ComplexityParams>({
    distance: 0,
    finition: 0,
    accessibilite: 0,
    etat: 0
  });

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);

  // Matrix Parameters
  const [prixJour, setPrixJour] = useState<number>(840);
  const PRIX_M2_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4];
  const M2_JOUR_VALUES = [200, 300, 400];
  const LOGEMENTS_JOUR_VALUES = [5, 6, 7];

  // Calculate matrix data
  const surfaceTotale = surface * phases;
  const totalUnits = nbLogements * phases;

  const generateMatrixData = (type: 'surface' | 'logement') => {
    const values = type === 'surface' ? M2_JOUR_VALUES : LOGEMENTS_JOUR_VALUES;
    let bestCell = { ecart: Infinity, row: 0, col: 0, prixProd: 0, prixMarche: 0 };

    const rows = PRIX_M2_VALUES.map((pM2, rowIdx) => {
      const prixMarche = surfaceTotale * pM2;
      const cells = values.map((val, colIdx) => {
        const nbJours = type === 'surface'
          ? (val > 0 ? surfaceTotale / val : Infinity)
          : (val > 0 ? totalUnits / val : Infinity);
        const prixProd = nbJours * prixJour;
        const ecart = prixMarche > 0 ? Math.abs((prixProd - prixMarche) / prixMarche * 100) : Infinity;

        if (ecart < bestCell.ecart) {
          bestCell = { ecart, row: rowIdx, col: colIdx, prixProd, prixMarche };
        }

        return { prixProd: Math.round(prixProd), ecart, prixM2: pM2 };
      });
      return { prixM2: pM2, cells };
    });

    return { rows, bestCell, values };
  };

  const matrixSurface = generateMatrixData('surface');
  const matrixLogement = nbLogements > 0 ? generateMatrixData('logement') : null;

  // GSAP Animations
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

  // Recalculate on input change
  useEffect(() => {
    const rawSolutions = findConvergentSolutions(nbLogements, surface, phases, typologies);
    const multiplier = calculateComplexityMultiplier(complexity);

    // Apply multiplier to all prices in solutions
    const adjustedSolutions = rawSolutions.map(sol => ({
      ...sol,
      priceFinal: Math.round(sol.priceFinal * multiplier),
      priceRaw: sol.priceRaw * multiplier,
      range: {
        min: Math.round(sol.range.min * multiplier),
        max: Math.round(sol.range.max * multiplier)
      },
      methods: sol.methods.map(m => ({
        ...m,
        price: m.price * multiplier
      })) as any
    }));

    setSolutions(adjustedSolutions);

    // Auto-select "reco" (Recommended) scenario by default
    if (adjustedSolutions.length > 0) {
      if (!selectedSolutionId || !adjustedSolutions.find(s => s.id === selectedSolutionId)) {
        const reco = adjustedSolutions.find(s => s.id === 'reco');
        setSelectedSolutionId(reco ? reco.id : adjustedSolutions[0].id);
      }
    }
  }, [nbLogements, surface, phases, complexity, typologies]);

  // Derived state
  const bestSolution = solutions.find(s => s.id === selectedSolutionId) || solutions[0];
  const complexityMultiplier = calculateComplexityMultiplier(complexity);

  const handleSave = async () => {
    // Import getStandardPhases to generate default phase items
    const { getStandardPhases } = await import('../services/calculationService');
    const standardPhases = getStandardPhases(phases);
    const phaseItems: PhaseItem[] = standardPhases.map(p => ({
      id: crypto.randomUUID(),
      type: p as Phase
    }));

    const projectData: ProjectData = {
      id: crypto.randomUUID(), // Generate a UUID for Supabase
      name: projectName || `Devis ${nbLogements} Logts`,
      date: new Date().toISOString(),
      client: client ? client.name : (clientName || 'Client Anonyme'),
      sellsyClientId: client?.id,
      sellsyClientType: client ? (client.type === 'person' ? 'individual' : 'company') : undefined,
      nbLogements,
      surfaceTotal: surface,
      nbPhases: phases,
      typologies,
      complexity,
      selectedSolution: bestSolution,
      activePhases: phaseItems
    };

    // Create Opportunity in Sellsy if client is selected
    if (client?.id) {
      try {
        const oppId = await createOpportunity(projectData, client.id);
        console.log("Opportunity created:", oppId);
      } catch (e) {
        console.error("Failed to create opportunity", e);
      }
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('quotes')
      .insert([{
        id: projectData.id,
        name: projectData.name,
        client_name: projectData.client,
        data: projectData
      }])
      .select()
      .single();

    if (error) {
      console.error("Error saving quote to Supabase:", error);
      toast.error("Erreur lors de la sauvegarde du devis.");
      return;
    }

    if (data) {
      // Navigate to Devis page with the saved project data
      toast.success("Devis sauvegardé !");
      navigate('/devis', { state: { project: projectData } });
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">

        {/* 1. IDENTITÉ (Top Left) - 4 cols */}
        <div className="bento-item md:col-span-4 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center gap-3 text-brand-blue mb-4">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <User className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">Identité</h2>
          </div>
          <div className="space-y-4 flex-grow">
            <ClientSearch
              initialValue={clientName}
              onSelect={(selected) => {
                if (typeof selected === 'string') {
                  setClient(null);
                  setClientName(selected);
                } else {
                  setClient(selected);
                  setClientName(selected.name);
                  if (!projectName) setProjectName(`Devis ${selected.name}`);
                }
              }}
            />
            <Input
              label="Nom du Projet"
              labelPlacement="outside"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </div>

        {/* 2. PRIX FINAL (Top Center/Right) - 8 cols */}
        <div className="bento-item md:col-span-8 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green opacity-10 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-slate-400 font-medium mb-2 text-lg">Estimation Recommandée (HT)</h2>
              <div className="flex items-baseline gap-3 justify-center md:justify-start">
                <span className="text-6xl lg:text-7xl font-bold text-white tracking-tighter">
                  {bestSolution ? bestSolution.priceFinal.toLocaleString('fr-FR') : '---'}
                </span>
                <span className="text-2xl text-brand-green font-bold">€</span>
              </div>
              <div className="flex items-center gap-3 mt-4 justify-center md:justify-start">
                <div className="px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600 text-xs font-mono text-slate-300">
                  {bestSolution?.range.min.toLocaleString()} € - {bestSolution?.range.max.toLocaleString()} €
                </div>
                <span className="text-slate-500 text-sm italic">
                  {bestSolution?.explanation}
                </span>
              </div>
            </div>

            <EyeCatchingButton_v2
              onClick={handleSave}
              className="group relative px-8 py-4 text-slate-900 rounded-2xl font-bold text-lg shadow-lg shadow-brand-green/20 transition-all overflow-hidden border-brand-green bg-[linear-gradient(110deg,#4D9805,45%,#65c206,55%,#4D9805)] dark:bg-[linear-gradient(110deg,#4D9805,45%,#65c206,55%,#4D9805)] dark:border-brand-green dark:text-white"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center gap-2">
                <Save className="w-5 h-5" />
                Valider le Devis
              </span>
            </EyeCatchingButton_v2>
          </div>
        </div>

        {/* 3. DONNÉES TECHNIQUES (Middle Left) - 4 cols, 2 rows */}
        <div className="bento-item md:col-span-4 md:row-span-2 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-3 text-brand-green mb-6">
            <div className="p-2 bg-brand-green/10 rounded-xl">
              <CalcIcon className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">Technique</h2>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Logements</label>
                <input
                  type="number"
                  value={nbLogements}
                  onChange={(e) => setNbLogements(Number(e.target.value))}
                  className="w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white outline-none mt-1"
                />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Surface m²</label>
                <input
                  type="number"
                  value={surface}
                  onChange={(e) => setSurface(Number(e.target.value))}
                  className="w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white outline-none mt-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Phasage</label>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[1, 2, 3, 4].map(p => (
                  <button
                    key={p}
                    onClick={() => setPhases(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${phases === p
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Typologies</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(typologies).map(t => (
                  <div key={t} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{t}</div>
                    <input
                      type="number"
                      value={typologies[t as keyof TypologyCount]}
                      onChange={(e) => setTypologies({ ...typologies, [t]: parseInt(e.target.value) || 0 })}
                      className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white text-center outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. COMPLEXITÉ (Middle Center) - 4 cols, 2 rows */}
        <div className="bento-item md:col-span-4 md:row-span-2 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-3 text-purple-500 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">Complexité</h2>
          </div>

          <div className="space-y-6">
            <RangeSlider
              label="Distance"
              value={complexity.distance}
              onChange={(v: number) => setComplexity({ ...complexity, distance: v })}
              min={0} max={20}
              unit="km"
              color="accent-purple-500"
            />
            <RangeSlider
              label="Finition"
              value={complexity.finition}
              onChange={(v: number) => setComplexity({ ...complexity, finition: v })}
              min={0} max={30}
              unit="%"
              color="accent-purple-500"
            />
            <RangeSlider
              label="Accès"
              value={complexity.accessibilite}
              onChange={(v: number) => setComplexity({ ...complexity, accessibilite: v })}
              min={0} max={20}
              unit="%"
              color="accent-purple-500"
            />
            <RangeSlider
              label="État Initial"
              value={complexity.etat}
              onChange={(v: number) => setComplexity({ ...complexity, etat: v })}
              min={0} max={30}
              unit="%"
              color="accent-purple-500"
            />

            <div className="mt-8 p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 flex justify-between items-center">
              <span className="text-purple-900 dark:text-purple-200 font-medium">Multiplicateur</span>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">x {complexityMultiplier.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 5. ANALYSE (Middle Right) - 4 cols, 2 rows */}
        <div className="bento-item md:col-span-4 md:row-span-2 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg flex flex-col">
          <div className="flex items-center gap-3 text-orange-500 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">Analyse Comparative</h2>
          </div>

          <div className="flex-grow flex flex-col gap-6">
            {/* Chart Section */}
            <div className="flex-1 min-h-[180px] bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-2 border border-slate-100 dark:border-slate-700/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSolution?.methods} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    formatter={(value: number) => [`${Math.round(value).toLocaleString()} €`, '']}
                  />
                  <Bar dataKey="price" radius={[6, 6, 0, 0]} barSize={40}>
                    {bestSolution?.methods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#f59e0b', '#0ea5e9'][index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Scenarios List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Scénarios Disponibles</h3>
              <div className="overflow-y-auto pr-1 custom-scrollbar space-y-2">
                {solutions.map((sol) => (
                  <div
                    key={sol.id}
                    onClick={() => setSelectedSolutionId(sol.id)}
                    className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 ${selectedSolutionId === sol.id
                      ? 'bg-brand-green/10 border-brand-green/30 shadow-sm'
                      : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-bold ${selectedSolutionId === sol.id ? 'text-brand-green' : 'text-slate-700 dark:text-slate-200'}`}>
                        {sol.explanation}
                      </span>
                      {selectedSolutionId === sol.id && <Check className="w-4 h-4 text-brand-green" />}
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded">
                        {sol.days.toFixed(1)}j
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white leading-none">
                          {sol.priceFinal.toLocaleString()} €
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {Math.round(sol.priceFinal / nbLogements).toLocaleString()} €/log
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 6. MATRICES DE CONVERGENCE - Full width */}
        <div className="bento-item md:col-span-12 bg-white/60 dark:bg-brand-card/60 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-violet-500">
              <div className="p-2 bg-violet-500/10 rounded-xl">
                <Grid3X3 className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-xl text-slate-900 dark:text-white">Matrices de Convergence</h2>
            </div>
            {/* Légende */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700"></div>
                <span className="text-slate-500">≤10% (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700"></div>
                <span className="text-slate-500">10-20% (Bon)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
                <span className="text-slate-500">&gt;20%</span>
              </div>
            </div>
          </div>

          {/* Prix Jour Input */}
          <div className="mb-6 flex items-center gap-4">
            <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Prix référence journée :</label>
            <input
              type="number"
              value={prixJour}
              onChange={(e) => setPrixJour(Number(e.target.value) || 0)}
              className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
            />
            <span className="text-sm text-slate-500">€/jour</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Matrice A: Surface */}
            <div>
              <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-3">Matrice Surface (€/m² vs m²/jour)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="bg-violet-500 text-white p-2 rounded-tl-lg text-xs">€/m²</th>
                      {matrixSurface.values.map(v => (
                        <th key={v} className="bg-violet-500 text-white p-2 text-xs">{v} m²/j</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixSurface.rows.map((row, rowIdx) => (
                      <tr key={row.prixM2}>
                        <td className="bg-violet-500 text-white p-2 font-bold text-center text-xs">{row.prixM2.toFixed(2)} €</td>
                        {row.cells.map((cell, colIdx) => {
                          const isBest = rowIdx === matrixSurface.bestCell.row && colIdx === matrixSurface.bestCell.col;
                          const cellClass = cell.ecart <= 10
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                            : cell.ecart <= 20
                              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                          return (
                            <td key={colIdx} className={`p-2 text-center border border-slate-200 dark:border-slate-700 ${cellClass} ${isBest ? 'ring-2 ring-violet-500 ring-inset' : ''}`}>
                              <div className="font-bold text-xs">{cell.prixProd.toLocaleString('fr-FR')} €</div>
                              <div className="text-[10px] opacity-70">Écart: {cell.ecart.toFixed(1)}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matrice B: Logement */}
            {matrixLogement && (
              <div>
                <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-3">Matrice Logement (€/m² vs log/jour)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="bg-violet-500 text-white p-2 rounded-tl-lg text-xs">€/m²</th>
                        {matrixLogement.values.map(v => (
                          <th key={v} className="bg-violet-500 text-white p-2 text-xs">{v} log/j</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixLogement.rows.map((row, rowIdx) => (
                        <tr key={row.prixM2}>
                          <td className="bg-violet-500 text-white p-2 font-bold text-center text-xs">{row.prixM2.toFixed(2)} €</td>
                          {row.cells.map((cell, colIdx) => {
                            const isBest = rowIdx === matrixLogement.bestCell.row && colIdx === matrixLogement.bestCell.col;
                            const cellClass = cell.ecart <= 10
                              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                              : cell.ecart <= 20
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                            return (
                              <td key={colIdx} className={`p-2 text-center border border-slate-200 dark:border-slate-700 ${cellClass} ${isBest ? 'ring-2 ring-violet-500 ring-inset' : ''}`}>
                                <div className="font-bold text-xs">{cell.prixProd.toLocaleString('fr-FR')} €</div>
                                <div className="text-[10px] opacity-70">Écart: {cell.ecart.toFixed(1)}%</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Convergence Summary */}
          <div className="mt-6 p-4 bg-violet-500/10 rounded-2xl border border-violet-500/20 flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Convergence Surface</div>
              <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {matrixSurface.bestCell.ecart !== Infinity
                  ? `${Math.round((matrixSurface.bestCell.prixProd + matrixSurface.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €`
                  : '---'}
              </div>
            </div>
            {matrixLogement && (
              <div className="text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Convergence Logement</div>
                <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                  {matrixLogement.bestCell.ecart !== Infinity
                    ? `${Math.round((matrixLogement.bestCell.prixProd + matrixLogement.bestCell.prixMarche) / 2).toLocaleString('fr-FR')} €`
                    : '---'}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
