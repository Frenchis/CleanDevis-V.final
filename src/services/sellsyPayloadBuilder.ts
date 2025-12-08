
import { ProjectData, GlobalConfig, Phase, SellsyEstimate, SellsyEstimateLine } from '../types';

const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '');
};

const getPhaseDescription = (phase: string, nbLogements: number, surfaceArea?: number): string => {
    const header = (surfaceArea && surfaceArea > 0)
        ? `[ Projet de ${surfaceArea} m² ] :`
        : `[ ${nbLogements} Appartements ] :`;

    switch (phase) {
        case 'OPR':
            return `<b>Nettoyage OPR :</b><br>${header}<br>Dépoussiérage des sols et lavage adapté suivant leurs natures.<br>Nettoyage des appareils sanitaires, lavabos, douches et baignoires.<br>Nettoyage de la faïence et des éviers.<br><br><b>Parties communes :</b><br>Dépoussiérage des sols et lavage adapté suivant leurs natures.<br>Lavage des marches/circulations d’escalier.`;
        case 'Vitrerie':
            return `<b>Nettoyage des vitreries - 1 Passage - :</b><br><br><b>Vitrerie intérieure :</b><br>Aspiration des rainures de fenêtres;<br>Lessivage des encadrements;<br>Nettoyage des vitreries sur les 2 faces.<br><br><b>Vitrerie extérieure :</b><br>Aspiration des rainures de fenêtres;<br>Lessivage des encadrements;<br>Nettoyage des vitreries sur les 2 faces.`;
        case 'Pré-livraison':
            return `<b>Nettoyage de Pré-livraison :</b><br>${header}<br>Dépoussiérage des sols et lavage adapté suivant leurs natures.<br>Nettoyage des appareils sanitaires, lavabos, douches et baignoires.<br>Nettoyage de la faïence et des éviers.<br><br><b>Parties communes :</b><br>Dépoussiérage des sols et lavage adapté suivant leurs natures.<br>Lavage des marches/circulations d’escalier`;
        case 'Livraison':
            return `<b>Nettoyage de Livraison :</b><br>${header}<br>Dépoussiérage des sols et lavage adapté suivant leurs natures.<br>Nettoyage des appareils sanitaires, lavabos, douches et baignoires.<br>Nettoyage de la faïence et des éviers.<br><br><b>Parties communes :</b><br>Dépoussiérage des sols et lavage adapté suivant leurs natures.<br>Lavage des marches/circulations d’escalier`;
        default:
            return `<b>${phase} :</b><br>${header}<br>Prestation de nettoyage.`;
    }
};

export const buildEstimatePayload = async (project: ProjectData, clientId: string, config: GlobalConfig, existingBreakdown?: any[]): Promise<SellsyEstimate> => {
    // Subject is no longer added as a line item
    // if (project.subject) { ... }

    const lines: SellsyEstimateLine[] = [];
    const solution = project.selectedSolution;

    if (!solution) throw new Error("Aucune solution sélectionnée pour le devis");

    // Dynamic import to avoid circular dependencies if any, though calculationService should be leaf
    const { calculateBreakdown, getStandardPhases } = await import('./calculationService');

    // Use activePhases from project data to support multiple phases of same type
    const activePhases = project.activePhases && project.activePhases.length > 0
        ? project.activePhases
        : getStandardPhases(project.nbPhases);

    // If existingBreakdown is passed (from UI with manual edits) AND has items, use it. 
    // Otherwise calculate it from scratch to ensure we don't send empty rows if calculation failed in UI.
    const breakdown = (existingBreakdown && existingBreakdown.length > 0)
        ? existingBreakdown
        : calculateBreakdown(solution.priceFinal, project.typologies, activePhases);

    // Get Tax ID for 20% - For the builder we assume 0 or passed via config if needed. 
    // Testing getTaxId here would require dependency injection for fetching from API.
    // For now we assume taxId is 0 or handled later, but the payload requires it.
    // We mock it as 0
    let taxId = 0;

    breakdown.forEach((phaseItem, index) => {
        // Insert page break before each phase except the first one
        if (index > 0) {
            lines.push({ type: 'break-page' });
        }

        const phaseName = phaseItem.phase;

        // Add Comment Line for Phase Description
        lines.push({
            type: 'comment',
            text: getPhaseDescription(phaseName, project.nbLogements, project.surfaceArea)
        });

        const productCode = config.sellsy?.productMapping?.[phaseName as Phase] || 'GENERIC_SERVICE';

        let hasTypologies = false;
        Object.entries(phaseItem.typologies).forEach(([type, price]) => {
            const count = project.typologies[type as keyof typeof project.typologies] || 0;
            if (count > 0) {
                hasTypologies = true;
                lines.push({
                    type: 'single',
                    reference: productCode,
                    description: `${phaseName} - Typologie ${type}`,
                    quantity: count.toString(),
                    unit_amount: price.toFixed(2), // Price per unit
                    tax_id: taxId
                });
            }
        });

        // FALLBACK: If no typologies were added (Global Surface Mode), add a single line for the phase
        if (!hasTypologies) {
            lines.push({
                type: 'single',
                reference: productCode,
                description: `${phaseName} - Forfait Global`,
                quantity: "1",
                unit_amount: phaseItem.totalPhase.toFixed(2),
                tax_id: taxId
            });
        }

        // Add Sub-Total for Phase
        lines.push({
            type: 'sub-total'
        });

        // Add Break Line
        lines.push({
            type: 'break-line'
        });
    });

    // Determine client type
    let relatedType = (project.sellsyClientType || 'company') as string;
    // Safeguard: if somehow it is 'client' or 'corporation', map it to 'company'
    if (relatedType === 'client' || relatedType === 'corporation') relatedType = 'company';
    if (relatedType === 'person') relatedType = 'individual';

    // Clean subject for the Sellsy Title (Plain text only)
    const cleanSubject = project.subject ? stripHtml(project.subject) : `Devis Nettoyage - ${project.name}`;

    return {
        related: [{
            type: relatedType as 'company' | 'individual',
            id: parseInt(clientId) || 0 // Safe parse
        }],
        subject: cleanSubject,
        currency: 'EUR',
        rows: lines,
        settings: {
            pdf_display: {
                show_reference_column: false
            }
        }
    };
};
