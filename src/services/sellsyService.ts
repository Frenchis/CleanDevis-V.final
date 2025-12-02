import { ProjectData, SellsyClient, SellsyEstimate, SellsyEstimateLine, GlobalConfig, Phase, SellsyItem } from '../types';
import { getConfig } from './calculationService';
import { supabase } from '../lib/supabaseClient';

const SELLSY_API_URL = '/sellsy-proxy/v2';



interface SellsyTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

// Helper to clear token
const clearToken = () => {
    const config = getConfig();
    const clientId = config.sellsy?.clientId || 'default';
    localStorage.removeItem(`sellsy_access_token_${clientId}`);
    localStorage.removeItem(`sellsy_token_expiry_${clientId}`);
};

// Helper to get access token with caching
const getAccessToken = async (config: GlobalConfig): Promise<string | null> => {
    const clientId = config.sellsy?.clientId || 'default';
    const tokenKey = `sellsy_access_token_${clientId}`;
    const expiryKey = `sellsy_token_expiry_${clientId}`;

    // Check cache
    const cachedToken = localStorage.getItem(tokenKey);
    const tokenExpiry = localStorage.getItem(expiryKey);

    if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        return cachedToken;
    }

    // Fetch new token via Supabase Edge Function
    try {
        console.log('Fetching Sellsy token via Supabase Edge Function...');
        const { data, error } = await supabase.functions.invoke('sellsy-auth', {
            method: 'POST',
        });

        if (error) {
            console.error('Supabase Function Error:', error);
            // Fallback for local dev if function is not running? 
            // No, we want to enforce security. But if config has keys, maybe we can warn?
            // For now, let's assume the function is the way to go.
            return null;
        }

        if (!data || !data.access_token) {
            console.error('No access token returned from Edge Function', data);
            return null;
        }

        // Cache token (expires_in is in seconds, remove 60s for safety buffer)
        const expiryTime = Date.now() + (data.expires_in - 60) * 1000;
        localStorage.setItem(tokenKey, data.access_token);
        localStorage.setItem(expiryKey, expiryTime.toString());

        return data.access_token;
    } catch (error) {
        console.error('Sellsy Auth Network Error:', error);
        return null;
    }
};

// Helper to get headers
const getHeaders = async (config: GlobalConfig, forceRefresh = false) => {
    if (forceRefresh) clearToken();
    const token = await getAccessToken(config);

    if (!token) {
        throw new Error("Impossible de s'authentifier auprès de Sellsy. Vérifiez vos identifiants.");
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const searchClients = async (query: string): Promise<SellsyClient[]> => {
    const config = getConfig();

    // MOCK MODE if no keys configured
    if (!config.sellsy?.clientId) {
        console.log('[Sellsy Mock] Searching clients for:', query);
        await new Promise(r => setTimeout(r, 800)); // Simulate network delay

        return [
            { id: '1', name: 'Acme Corp', type: 'corporation' as const, city: 'Paris', email: 'contact@acme.com' },
            { id: '2', name: 'John Doe', type: 'person' as const, city: 'Lyon', email: 'john@doe.com' },
            { id: '3', name: 'Syndic Résidence Les Lilas', type: 'corporation' as const, city: 'Nantes', email: 'syndic@lilas.fr' }
        ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    }

    // REAL API CALL
    const performSearch = async (retry = false): Promise<SellsyClient[]> => {
        try {
            const headers = await getHeaders(config, retry);

            // Try to use wildcard for partial match if supported by Sellsy API (undocumented but common)
            // If not supported, it might fail or return exact match only.
            // Reverting to 'name' key is the priority.
            const filterName = query;

            const [companiesRes, individualsRes] = await Promise.all([
                fetch(`${SELLSY_API_URL}/companies/search`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ filters: { name: filterName } })
                }),
                fetch(`${SELLSY_API_URL}/individuals/search`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ filters: { name: filterName } })
                })
            ]);

            // If either is 401, retry both
            if ((companiesRes.status === 401 || individualsRes.status === 401) && !retry) {
                console.warn('Sellsy Token expired or invalid. Retrying...');
                return performSearch(true);
            }

            let companies: SellsyClient[] = [];
            if (companiesRes.ok) {
                const data = await companiesRes.json();
                companies = (data.data || []).map((c: any) => ({
                    ...c,
                    name: c.name || c.fullName || c.third?.name || "Nom inconnu",
                    type: 'corporation'
                }));
            } else {
                console.error('Companies Search Error:', companiesRes.status);
            }

            let individuals: SellsyClient[] = [];
            if (individualsRes.ok) {
                const data = await individualsRes.json();
                individuals = (data.data || []).map((i: any) => ({
                    id: i.id,
                    name: `${i.last_name || ''} ${i.first_name || ''}`.trim() || "Nom inconnu",
                    type: 'person',
                    email: i.email,
                    city: i.address?.city,
                    postalCode: i.address?.postalCode
                }));
            } else {
                console.error('Individuals Search Error:', individualsRes.status);
            }

            return [...companies, ...individuals];

        } catch (error) {
            console.error('Sellsy Search Error:', error);
            return [];
        }
    };

    return performSearch();
};

export const searchItems = async (query: string): Promise<SellsyItem[]> => {
    const config = getConfig();

    // MOCK MODE
    if (!config.sellsy?.clientId) {
        await new Promise(r => setTimeout(r, 500));
        return [
            { id: '1', name: 'Prestation de nettoyage', type: 'service' as const, unitAmount: '50.00', unit: 'h' },
            { id: '2', name: 'Produit détergent', type: 'product' as const, unitAmount: '15.00', unit: 'L' },
            { id: '3', name: 'Location nacelle', type: 'service' as const, unitAmount: '250.00', unit: 'j' }
        ].filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
    }

    // REAL API CALL
    const performSearch = async (retry = false): Promise<SellsyItem[]> => {
        try {
            const headers = await getHeaders(config, retry);
            const response = await fetch(`${SELLSY_API_URL}/items/search`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    filters: {
                        name: query
                    }
                })
            });

            if (response.status === 401 && !retry) {
                return performSearch(true);
            }

            if (!response.ok) {
                console.error('Sellsy Items Search Error:', response.status);
                return [];
            }

            const data = await response.json();
            return (data.data || []).map((item: any) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                unitAmount: item.sale_price?.amount || '0',
                unit: item.unit?.label || ''
            }));
        } catch (error) {
            console.error('Sellsy Items Search Error:', error);
            return [];
        }
    };

    return performSearch();
};

export const createOpportunity = async (project: ProjectData, clientId: string): Promise<string | null> => {
    const config = getConfig();

    if (!config.sellsy?.clientId) {
        console.log('[Sellsy Mock] Creating Opportunity:', { project, clientId });
        await new Promise(r => setTimeout(r, 1000));
        return 'opp_mock_12345';
    }

    // Real implementation would go here
    return null;
};

// Helper to get taxes
const getTaxes = async (config: GlobalConfig): Promise<{ id: number; rate: number; label: string }[]> => {
    try {
        const headers = await getHeaders(config);
        const response = await fetch(`${SELLSY_API_URL}/taxes`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            console.error('Sellsy Taxes API Error:', response.status);
            return [];
        }

        const data = await response.json();
        return data.data.map((t: any) => ({
            id: t.id,
            rate: parseFloat(t.rate),
            label: t.label
        }));
    } catch (error) {
        console.error('Sellsy Taxes Error:', error);
        return [];
    }
};

const getTaxId = async (config: GlobalConfig, rate: number): Promise<number> => {
    // Default to a known ID if possible, or fetch
    // For now, let's fetch and cache in memory or just fetch
    const taxes = await getTaxes(config);
    const tax = taxes.find(t => Math.abs(t.rate - rate) < 0.1);
    return tax ? tax.id : 0; // 0 or throw error? Sellsy might require a valid ID.
};

const getPhaseDescription = (phase: string, nbLogements: number): string => {
    const header = `[${nbLogements} Appartements ] :`;

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

const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '');
};

export const createEstimate = async (project: ProjectData, clientId: string): Promise<{ id: number, publicLink?: string } | null> => {
    const config = getConfig();
    const solution = project.selectedSolution;

    if (!solution) throw new Error("Aucune solution sélectionnée pour le devis");

    const performCreate = async (retry = false): Promise<{ id: number, publicLink?: string } | null> => {
        try {
            const lines: SellsyEstimateLine[] = [];

            // Add Subject as the first line (Comment) if it exists
            if (project.subject) {
                lines.push({
                    type: 'comment',
                    text: project.subject // Keep HTML here for rich text display
                });
                lines.push({ type: 'break-line' }); // Add spacing
            }

            const { calculateBreakdown, getStandardPhases } = await import('./calculationService');
            const activePhases = getStandardPhases(project.nbPhases);
            const breakdown = calculateBreakdown(solution.priceFinal, project.typologies, activePhases);

            // Get Tax ID for 20%
            let taxId = 0;
            if (config.sellsy?.clientId) {
                taxId = await getTaxId(config, 20);
                if (!taxId) console.warn("Tax ID for 20% not found in Sellsy. Using 0.");
            }

            breakdown.forEach((phaseItem, index) => {
                // Insert page break before each phase except the first one
                if (index > 0) {
                    lines.push({ type: 'break-page' });
                }

                const phaseName = phaseItem.phase;

                // Add Comment Line for Phase Description
                lines.push({
                    type: 'comment',
                    text: getPhaseDescription(phaseName, project.nbLogements)
                });

                const productCode = config.sellsy?.productMapping?.[phaseName as Phase] || 'GENERIC_SERVICE';

                Object.entries(phaseItem.typologies).forEach(([type, price]) => {
                    const count = project.typologies[type as keyof typeof project.typologies] || 0;
                    if (count > 0) {
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

            const estimate: SellsyEstimate = {
                related: [{
                    type: relatedType as 'company' | 'individual',
                    id: parseInt(clientId)
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

            if (!config.sellsy?.clientId) {
                console.log('[Sellsy Mock] Creating Estimate:', JSON.stringify(estimate, null, 2));
                await new Promise(r => setTimeout(r, 1500));
                return { id: 98765, publicLink: 'https://mock.sellsy.com/estimate/98765' };
            }

            // Real API Call
            const headers = await getHeaders(config, retry);
            console.log('Sending Sellsy Payload:', JSON.stringify(estimate, null, 2));

            const response = await fetch(`${SELLSY_API_URL}/estimates`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(estimate)
            });

            if (response.status === 401 && !retry) {
                console.warn('Sellsy Token expired or invalid. Retrying...');
                return performCreate(true);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Sellsy API Error:", errorText);
                throw new Error(`Erreur Sellsy: ${response.statusText} - ${errorText}`);
            }

            // Log Quota Information
            const remainingDay = response.headers.get('X-Quota-Remaining-By-Day');
            if (remainingDay) {
                console.log(`[Sellsy Quota] Remaining requests for today: ${remainingDay}`);
            }

            const data = await response.json();
            return {
                id: data.id,
                publicLink: data.public_link
            };
        } catch (error) {
            console.error('Sellsy Estimate Error:', error);
            throw error;
        }
    };

    return performCreate();
};

/**
 * Create an estimate directly from template items
 */
export const createEstimateFromTemplate = async (
    client: { id: string, type: 'individual' | 'corporation' },
    items: any[],
    name: string,
    subject?: string
): Promise<{ id: string } | null> => {
    const config = getConfig();

    const performCreate = async (retry = false): Promise<{ id: string } | null> => {
        try {
            const headers = await getHeaders(config, retry);

            // Get Tax ID for 20%
            let taxId = 0;
            if (config.sellsy?.clientId) {
                taxId = await getTaxId(config, 20);
                if (!taxId) console.warn("Tax ID for 20% not found in Sellsy. Using 0.");
            }

            // Prepare rows
            const rows: any[] = [];

            // Add Subject as the first line (Comment) if it exists
            if (subject) {
                rows.push({
                    type: 'comment',
                    text: subject // Keep HTML here
                });
                rows.push({ type: 'break-line' });
            }

            // Map template items to Sellsy row format
            items.forEach(item => {
                if (item.type === 'break-page') {
                    rows.push({ type: 'break-page' });
                } else if (item.type === 'comment') {
                    rows.push({ type: 'comment', text: item.text || '' });
                } else if (item.type === 'sub-total') {
                    rows.push({ type: 'sub-total' });
                } else {
                    // Standard product row
                    rows.push({
                        type: 'single',
                        reference: item.id.startsWith('sellsy-') ? item.id.replace('sellsy-', '') : 'GENERIC',
                        description: item.name,
                        quantity: item.quantity.toString(),
                        unit_amount: item.price.toFixed(2),
                        tax_id: taxId // Use valid tax ID
                    });
                }
            });

            // Clean subject for the Sellsy Title (Plain text only)
            const cleanSubject = subject ? stripHtml(subject) : name;

            const payload = {
                related: [{
                    type: client.type === 'corporation' ? 'company' : 'individual',
                    id: parseInt(client.id)
                }],
                subject: cleanSubject,
                rows: rows,
                currency: 'EUR',
                settings: {
                    pdf_display: {
                        show_reference_column: false
                    }
                }
            };

            console.log("Sending payload to Sellsy:", JSON.stringify(payload, null, 2));

            const response = await fetch(`${SELLSY_API_URL}/estimates`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.status === 401 && !retry) {
                console.warn('Sellsy Token expired or invalid. Retrying...');
                return performCreate(true);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Sellsy API Error:", errorText);
                throw new Error(`Erreur Sellsy: ${response.statusText}`);
            }

            const data = await response.json();
            return { id: data.id };

        } catch (error) {
            console.error("Error creating estimate from template:", error);
            return null;
        }
    };

    return performCreate();
};

