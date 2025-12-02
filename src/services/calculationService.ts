
import { Solution, GlobalConfig, BreakdownItem, TypologyCount, ConvergenceMethod, TypologyPerformance } from '../types';

// --- NEW CONSTANTS (SPEC 2.0) ---
const BASIS_DAILY_RATE = 840;
const YIELD_LOW = 300; // M3
const YIELD_HIGH = 420; // M4
const MARKET_RATE = { 1: 4.0, 2: 5.5, 3: 7.5, 4: 9.0 }; // M2 per phase

const RATES: TypologyPerformance = {
  T1: 8, T2: 7, T3: 6, T4: 5, T5: 4, Autre: 5
};

const THEO_SURFACE: Record<string, number> = {
  T1: 28, T2: 45, T3: 65, T4: 85, T5: 105, Autre: 50
};

const PHASE_COEFFS: Record<number, number> = {
  1: 1.3,
  2: 2.0,
  3: 2.75,
  4: 3.5
};

// --- LEGACY CONFIG (Kept for Settings.tsx compatibility) ---
export const DEFAULT_CONFIG: GlobalConfig = {
  dailyRate: BASIS_DAILY_RATE,
  productivity: {
    surfaceMin: YIELD_LOW,
    surfaceMax: YIELD_HIGH,
    typologies: RATES
  },
  marketRate: MARKET_RATE,
  sellsy: {
    clientId: import.meta.env.VITE_SELLSY_CLIENT_ID || '',
    productMapping: {
      'Vitrerie': 'REE-VITRERIE',
      'OPR': 'REE-OPR',
      'Pré-livraison': 'REE-PRELIVR',
      'Livraison': 'REE-LIVRAISON'
    }
  }
};

export const PHASE_WEIGHTS = {
  'Vitrerie': 1,
  'OPR': 4,
  'Pré-livraison': 3,
  'Livraison': 2
};

export const getConfig = (): GlobalConfig => {
  const saved = localStorage.getItem('cleanDevis_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

export const getStandardPhases = (nbPhases: number): string[] => {
  if (nbPhases === 4) return ['Vitrerie', 'OPR', 'Pré-livraison', 'Livraison'];
  if (nbPhases === 3) return ['OPR', 'Pré-livraison', 'Livraison'];
  if (nbPhases === 2) return ['OPR', 'Livraison'];
  return ['Livraison'];
};

export const calculateComplexityMultiplier = (complexity: any): number => {
  const totalPercent =
    complexity.distance +
    complexity.finition +
    complexity.accessibilite +
    complexity.etat;

  return 1 + (totalPercent / 100);
};

/**
 * CORE CALCULATION ENGINE - SPEC 2.0
 */
export const findConvergentSolutions = (
  nbLogements: number,
  surface: number,
  nbPhases: number,
  typologies: TypologyCount
): Solution[] => {

  const config = getConfig();
  const dailyRate = config.dailyRate;
  const marketRates = config.marketRate;
  const yieldLow = config.productivity.surfaceMin;
  const yieldHigh = config.productivity.surfaceMax;
  const typoRates = config.productivity.typologies;

  // 1. Calculate Production Days & Simulated Surface
  let totalProductionDays = 0;
  let simulatedSurface = 0;

  Object.entries(typologies).forEach(([type, count]) => {
    const rate = typoRates[type as keyof typeof typoRates] || 5;
    const theoSurf = THEO_SURFACE[type as keyof typeof THEO_SURFACE] || 50;

    if (count > 0) {
      totalProductionDays += count / rate;
      simulatedSurface += count * theoSurf;
    }
  });

  // 2. Determine Phase Coefficient
  const kPhase = PHASE_COEFFS[nbPhases] || 2.75;

  // 3. Calculate M1 (Recommended)
  const dryCost = totalProductionDays * dailyRate;
  const priceM1 = dryCost * kPhase;
  const avgYieldLog = totalProductionDays > 0 ? (nbLogements * nbPhases) / totalProductionDays : 0; // Just for info

  // 4. Calculate Comparative Methods
  const surfaceToUse = surface > 0 ? surface : simulatedSurface;
  const smoothingFactor = 0.8;

  // M2: Market
  const currentMarketRate = marketRates[nbPhases] || marketRates[3] || 7.5;
  const priceM2 = surfaceToUse * currentMarketRate;

  // M3: High (Low Yield)
  const daysM3 = surfaceToUse / yieldLow;
  const priceM3 = (daysM3 * dailyRate) * (kPhase * smoothingFactor);

  // M4: Low (High Yield)
  const daysM4 = surfaceToUse / yieldHigh;
  const priceM4 = (daysM4 * dailyRate) * (kPhase * smoothingFactor);

  // --- OUTPUT FORMATTING ---
  const prices = [priceM1, priceM2, priceM3, priceM4].filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Convergence (Variance)
  const variance = Math.abs(maxPrice - minPrice) / (priceM1 || 1) * 100;

  const methods: ConvergenceMethod[] = [
    {
      name: "Approche Technique",
      type: 'M1',
      price: priceM1,
      details: `${totalProductionDays.toFixed(1)} jours prod.`,
      paramValue: totalProductionDays,
      paramUnit: "jours"
    },
    {
      name: "Approche Marché",
      type: 'M2',
      price: priceM2,
      details: `${currentMarketRate} €/m²`,
      paramValue: currentMarketRate,
      paramUnit: "€/m²"
    },
    {
      name: "Scénario Pessimiste",
      type: 'M3',
      price: priceM3,
      details: `${yieldLow} m²/j`,
      paramValue: yieldLow,
      paramUnit: "m²/j"
    },
    {
      name: "Scénario Optimiste",
      type: 'M4',
      price: priceM4,
      details: `${yieldHigh} m²/j`,
      paramValue: yieldHigh,
      paramUnit: "m²/j"
    }
  ];

  const solutions: Solution[] = [];

  // 1. RECOMMANDÉ (M1)
  solutions.push({
    id: 'reco',
    priceRaw: priceM1,
    priceFinal: priceM1,
    convergenceScore: parseFloat(variance.toFixed(1)),
    days: totalProductionDays * kPhase, // Total estimated days including coeff
    methods: methods,
    explanation: "Prix Recommandé (Technique)",
    range: { min: minPrice, max: maxPrice }
  });

  // 2. BASSE (M4)
  solutions.push({
    id: 'low',
    priceRaw: priceM4,
    priceFinal: priceM4,
    convergenceScore: 0,
    days: daysM4 * kPhase * smoothingFactor,
    methods: methods,
    explanation: "Scénario Optimiste (Rapide)",
    range: { min: minPrice, max: maxPrice }
  });

  // 3. HAUTE (M3)
  solutions.push({
    id: 'high',
    priceRaw: priceM3,
    priceFinal: priceM3,
    convergenceScore: 0,
    days: daysM3 * kPhase * smoothingFactor,
    methods: methods,
    explanation: "Scénario Pessimiste (Lent)",
    range: { min: minPrice, max: maxPrice }
  });

  // 4. MARCHÉ (M2)
  solutions.push({
    id: 'market',
    priceRaw: priceM2,
    priceFinal: priceM2,
    convergenceScore: 0,
    days: 0, // Not time based
    methods: methods,
    explanation: "Prix Marché (Comparatif)",
    range: { min: minPrice, max: maxPrice }
  });

  return solutions.sort((a, b) => a.priceFinal - b.priceFinal);
};

export const calculateBreakdown = (
  totalPrice: number,
  typologies: TypologyCount,
  activePhases: string[]
): BreakdownItem[] => {

  const config = getConfig();
  const typoRates = config.productivity.typologies;

  // Use new RATES for weighting
  let totalWeight = 0;

  Object.entries(typologies).forEach(([key, count]) => {
    const unitsPerDay = typoRates[key as keyof typeof typoRates] || 5;
    const timeWeight = 1 / unitsPerDay;
    totalWeight += count * timeWeight;
  });

  if (totalWeight === 0) totalWeight = 1;

  let totalPhaseWeight = 0;
  activePhases.forEach(p => {
    totalPhaseWeight += PHASE_WEIGHTS[p as keyof typeof PHASE_WEIGHTS] || 0;
  });

  const breakdown: BreakdownItem[] = activePhases.map(phaseName => {
    const pWeight = PHASE_WEIGHTS[phaseName as keyof typeof PHASE_WEIGHTS] || 0;
    const phaseTotal = totalPrice * (pWeight / totalPhaseWeight);

    const typoPrices: Record<string, number> = {};
    Object.keys(typologies).forEach(tKey => {
      const unitsPerDay = typoRates[tKey as keyof typeof typoRates] || 5;
      const timeWeight = 1 / unitsPerDay;

      // Répartition proportionnelle au temps estimé
      typoPrices[tKey] = (phaseTotal / totalWeight) * timeWeight;
    });

    return {
      phase: phaseName,
      totalPhase: phaseTotal,
      typologies: typoPrices
    };
  });

  return breakdown;
};
