
import { ProjectData, GlobalConfig, TypologyCount, Phase } from '../types';
import { getHeaders } from './sellsyService';
import { getConfig } from './calculationService';

interface SellsyRow {
    type: string;
    reference?: string;
    description?: string;
    quantity?: string;
    unit_amount?: string;
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

    try {
        const headers = await getHeaders(config);
        const response = await fetch(`https://api.sellsy.com/v2/estimates/${estimateId}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Erreur Sellsy: ${response.statusText}`);
        }

        const data = await response.json();
        const estimate = data.id ? data : data.data; // Handle potential wrapper

        if (!estimate || !estimate.rows) {
            throw new Error("Devis invalide ou sans lignes");
        }

        // Parsing Logic
        const activePhases: string[] = [];
        const typologies: TypologyCount = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, Autre: 0 };
        let currentPhase: Phase | null = null;
        let surfaceTotal = 0; // Won't be accurate but init
        let totalLogements = 0; // Won't be accurate

        // Updated Regex to be more permissive (User data: "Vitrerie T2 :")
        // Use word boundary to avoid matching "T2" inside other words if any.
        // Matches T1, T2, T3... or Autre.
        const typologyRegex = /\b(T\d+|Autre)\b/i;

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

        (estimate.rows as SellsyRow[]).forEach((row, idx) => {
            const cleanDesc = row.description ? extractTextFromHtml(row.description) : '';

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
                    if (!activePhases.includes(phase)) activePhases.push(phase);
                }
            }

            // If this line determines a phase (via ref), set it as current context
            if (linePhase) {
                currentPhase = linePhase;
                if (!activePhases.includes(linePhase)) activePhases.push(linePhase);
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

        const projectData: Partial<ProjectData> = {
            name: estimate.subject || `Import Sellsy ${estimateId}`,
            activePhases: activePhases,
            typologies: typologies,
            nbPhases: activePhases.length,
            // We can't recover solution details, so we might need a "Custom/Imported" mode
            // For now we assume the user will adjust.
        };

        return projectData;

    } catch (error) {
        console.error("Import Sellsy Error:", error);
        throw error;
    }
};
