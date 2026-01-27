
import { ProjectData, GlobalConfig, TypologyCount, Phase, PhaseItem } from '../types';
import { getHeaders } from './sellsyService';
import { getConfig } from './calculationService';

interface SellsyRow {
    type: string;
    reference?: string;
    description?: string;
    quantity?: string;
    unit_amount?: string;
    unitAmount?: string; // Add camelCase support
}

const extractTextFromHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '').trim();
};

const detectPhaseFromText = (text: string): Phase | null => {
    if (text.includes('Nettoyage OPR')) return Phase.OPR;
    if (text.includes('Nettoyage des vitreries')) return Phase.VITRERIE;
    if (text.includes('Nettoyage de Pré-livraison') || text.includes('Prélivraison')) return Phase.PRE_LIVRAISON;
    if (text.includes('Nettoyage de Livraison')) return Phase.LIVRAISON;
    return null;
};

export const importEstimateFromSellsy = async (estimateId: number): Promise<Partial<ProjectData> | null> => {
    const config = getConfig();

    if (!config.sellsy?.clientId) {
        throw new Error("Configuration Sellsy manquante");
    }

    const performImport = async (retry = false): Promise<Partial<ProjectData> | null> => {
        try {
            const headers = await getHeaders(config, retry);
            const response = await fetch(`https://api.sellsy.com/v2/estimates/${estimateId}`, {
                method: 'GET',
                headers: headers
            });

            if (response.status === 401 && !retry) {
                console.warn('Sellsy Token expired during import. Retrying...');
                // Force refresh token via retry=true which triggers getHeaders(config, true)
                return performImport(true);
            }

            if (!response.ok) {
                if (response.status === 404) throw new Error("Devis introuvable (ID incorrect ?)");
                throw new Error(`Erreur Sellsy: ${response.statusText}`);
            }

            const data = await response.json();
            const estimate = data.id ? data : data.data; // Handle potential wrapper

            if (!estimate || !estimate.rows) {
                throw new Error("Devis invalide ou sans lignes");
            }

            // Parsing Logic
            const activePhases: PhaseItem[] = []; // Fix: Use PhaseItem[]
            const typologies: TypologyCount = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, Autre: 0, PC: 0 };
            let currentPhase: Phase | null = null;
            let totalAmount = 0; // Track total price

            // Updated Regex to be more permissive (User data: "Vitrerie T2 :")
            // Use word boundary to avoid matching "T2" inside other words if any.
            // Matches T1, T2, T3... or Autre.
            const typologyRegex = /\b(T\d+|Autre|PC)\b/i;

            // Create a reverse mapping for faster lookup: Code -> Phase
            const codeToPhase: Record<string, Phase> = {};
            if (config.sellsy?.productMapping) {
                Object.entries(config.sellsy.productMapping).forEach(([phase, code]) => {
                    if (code) codeToPhase[code] = phase as Phase;
                });
            } else {
                console.warn("Import Sellsy: productMapping is missing in config!");
            }

            // console.log("Code to Phase Mapping:", codeToPhase);

            (estimate.rows as SellsyRow[]).forEach((row: SellsyRow, idx: number) => {
                const cleanDesc = row.description ? extractTextFromHtml(row.description) : '';

                // Calculate Row Total
                const qty = parseFloat(row.quantity || '0');
                // Check both snake_case and camelCase
                const unit = parseFloat(row.unitAmount || row.unit_amount || '0');
                totalAmount += qty * unit;

                let linePhase: Phase | null = null;
                if (row.reference && codeToPhase[row.reference]) {
                    linePhase = codeToPhase[row.reference];
                }

                // console.log(`Row ${idx}: Ref=${row.reference} Phase=${linePhase} Desc=${cleanDesc}`);

                // If line has no reference or generic, fallback to context (currentPhase detected from comments)
                // Check for Phase Header (Comment line)
                if (row.type === 'comment') {
                    const phase = detectPhaseFromText(cleanDesc);
                    if (phase) {
                        currentPhase = phase;
                        // Add phase if not already present (using type check)
                        if (!activePhases.some(p => p.type === phase)) {
                            activePhases.push({ id: crypto.randomUUID(), type: phase });
                        }
                    }
                }

                // If this line determines a phase (via ref), set it as current context
                if (linePhase) {
                    currentPhase = linePhase;
                    if (!activePhases.some(p => p.type === linePhase)) {
                        activePhases.push({ id: crypto.randomUUID(), type: linePhase });
                    }
                }

                // Check for Line Item (Typology)
                if ((row.type === 'single' || row.type === 'catalog') && currentPhase) { // Support 'catalog' type based on logs
                    const match = cleanDesc.match(typologyRegex);
                    if (match && match[1]) {
                        const typeKey = match[1] as keyof TypologyCount;
                        const quantity = parseFloat(row.quantity || '0');

                        // If typologies are broken down by phase (e.g. 5 T1 in OPR, 5 T1 in Vitrerie),
                        // ProjectData stores GLOBAL typologies. 
                        // We should take the MAX count found in any single phase for a given typology?
                        // OR should we assume the user puts the full count in each phase?
                        // Usually, it's the same count repeated.
                        // So taking the MAX is safer than summing (which would double the count).
                        // However, if they split 2 T1 in OPR and 3 T1 in OPR (unlikely), sum is better.
                        // But across phases (OPR vs Vitrerie), it's definitely repetition of the SAME project scope.
                        // So for T1: max(count(T1 in OPR), count(T1 in Vitrerie)).
                        // BUT here we iterate row by row.
                        // We simply update if we find a larger quantity for this Typology key.
                        // This handles the "repetition across phases" effectively.
                        if (typologies[typeKey] < quantity) {
                            typologies[typeKey] = quantity;
                        }
                    }
                }
            });

            let sellsyClientId = '';
            let sellsyClientType: 'company' | 'individual' = 'company';
            let clientName = '';

            // Extract Client Info
            if (estimate.related && estimate.related.length > 0) {
                const client = estimate.related.find((r: any) => r.type === 'company' || r.type === 'individual' || r.type === 'person');
                if (client) {
                    sellsyClientId = client.id;
                    sellsyClientType = client.type === 'person' ? 'individual' : client.type;
                }
            } else if (estimate.client) {
                sellsyClientId = estimate.client.id;
                sellsyClientType = estimate.client.type === 'person' ? 'individual' : estimate.client.type;
            }

            // Try to get client name
            if (estimate.third_name) clientName = estimate.third_name;
            else if (estimate.client_name) clientName = estimate.client_name;

            const projectData: Partial<ProjectData> = {
                name: estimate.subject || `Import Sellsy ${estimateId}`,
                client: clientName,
                sellsyClientId: sellsyClientId,
                sellsyClientType: sellsyClientType,
                sellsyEstimateId: estimate.id, // Add Imported ID
                activePhases: activePhases,
                typologies: typologies,
                nbPhases: activePhases.length,
                // We can't recover solution details, so we might need a "Custom/Imported" mode
                // For now we assume the user will adjust.
                // Reconstruct a "Manual" solution with the imported price
                selectedSolution: {
                    id: 'import',
                    priceRaw: totalAmount,
                    priceFinal: totalAmount,
                    convergenceScore: 100,
                    days: 0,
                    methods: [],
                    explanation: "Prix Importé Sellsy",
                    range: { min: totalAmount, max: totalAmount }
                }
            };

            return projectData;

        } catch (error) {
            console.error("Import Sellsy Error:", error);
            throw error;
        }
    };

    return performImport();
};

