
export enum Phase {
  VITRERIE = 'Vitrerie',
  OPR = 'OPR',
  PRE_LIVRAISON = 'Pré-livraison',
  LIVRAISON = 'Livraison',
}

export interface TypologyCount {
  T1: number;
  T2: number;
  T3: number;
  T4: number;
  T5: number;
  Autre: number;
}

export interface TypologyPerformance {
  T1: number; // Unités / jour
  T2: number;
  T3: number;
  T4: number;
  T5: number;
  Autre: number;
}



export interface ComplexityParams {
  distance: number; // 0-100% impact
  finition: number; // 0-100% impact
  accessibilite: number; // 0-100% impact
  etat: number; // 0-100% impact
}

export interface ConvergenceMethod {
  name: string;
  price: number;
  details: string;
  paramValue: number;
  paramUnit: string;
  type: 'M1' | 'M2' | 'M3' | 'M4';
}

export interface Solution {
  id: string;
  priceRaw: number;
  priceFinal: number;
  convergenceScore: number; // Percentage deviation
  days: number;
  methods: ConvergenceMethod[];
  explanation: string;
  range: { min: number; max: number };
}


export interface PhaseItem {
  id: string; // Unique UUID
  type: Phase;
}

export interface ProjectData {
  id: string;
  name: string;
  subject?: string; // Objet du devis (Sellsy)
  date: string;
  client: string;
  sellsyClientId?: string;
  sellsyClientType?: 'company' | 'individual';
  nbLogements: number;
  surfaceTotal: number;
  nbPhases: number;
  typologies: TypologyCount;
  surfaceArea?: number; // Optional surface area
  activePhases: PhaseItem[]; // Updated to support duplicates
  complexity: ComplexityParams;
  selectedSolution: Solution | null;
}

export interface BreakdownItem {
  id: string; // Unique ID for this breakdown item (e.g. "Vitrerie-0")
  phase: string;
  totalPhase: number;
  typologies: {
    [key: string]: number; // Price per unit for this type in this phase
  };
}

export interface GlobalConfig {
  dailyRate: number; // Coût équipe jour (840€)

  productivity: {
    surfaceMin: number; // m²/jour (ex: 300) -> Méthode 3
    surfaceMax: number; // m²/jour (ex: 400) -> Méthode 4
    typologies: TypologyPerformance; // Cadence cible par type (unités/jour) -> Méthode 1
  };

  marketRate: { [phases: number]: number }; // Prix marché au m² par nombre de phases

  sellsy?: {
    clientId: string;
    clientSecret?: string;
    productMapping: {
      [key in Phase]?: string; // Phase Name -> Sellsy Product ID/Code
    };
  };
}

// --- SELLSY TYPES ---

export interface SellsyClient {
  id?: string;
  name: string;
  type: 'corporation' | 'person';
  contactId?: string; // Main contact ID
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface SellsyItem {
  id: string;
  name: string;
  type: 'product' | 'service';
  unitAmount: string;
  unit: string;
}

export interface SellsyContact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface SellsySmartTag {
  id: string;
  value: string;
}

export interface SellsyAddress {
  id?: string;
  name: string; // "Siège social", "Facturation", etc.
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string; // "FR"
}

export interface SellsyEstimateItem {
  type: 'single';
  reference: string;
  description: string;
  quantity: string;
  unit_amount: string;
  tax_id: number;
}

export interface SellsyEstimateComment {
  type: 'comment';
  text: string;
}

export interface SellsyEstimateSubTotal {
  type: 'sub-total';
}

export interface SellsyEstimateBreakLine {
  type: 'break-line';
}

export interface SellsyEstimatePageBreak {
  type: 'break-page';
}

export type SellsyEstimateLine = SellsyEstimateItem | SellsyEstimateComment | SellsyEstimateSubTotal | SellsyEstimateBreakLine | SellsyEstimatePageBreak;

export interface SellsyEstimate {
  id?: string;
  related: { type: 'company' | 'individual'; id: number }[];
  contactId?: string; // Main contact ID
  subject: string;
  currency: string; // "EUR"
  rows: SellsyEstimateLine[];
  settings?: {
    pdf_display?: {
      show_reference_column?: boolean;
    };
  };
  taxes?: { id: string; rate: number }[]; // Tax definitions if needed
}
