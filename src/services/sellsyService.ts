import { ProjectData, SellsyClient, SellsyEstimate, SellsyEstimateLine, GlobalConfig, Phase, SellsyItem } from '../types';
import { getConfig } from './calculationService';
import { supabase } from '../lib/supabaseClient';

// Helper to determine API URL based on environment
const getApiUrl = (endpoint: string) => {
    // In development (Vite), use the local proxy
    if (import.meta.env.DEV) {
        return `/api/sellsy${endpoint}`;
    }
    // In production (Vercel), use the serverless proxy function
    return `/api/proxy?endpoint=${encodeURIComponent(endpoint)}`;
};

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

// Helper to get headers with auth handling
const getHeaders = async (config: GlobalConfig, forceRefresh = false): Promise<Headers> => {
    const clientId = config.sellsy?.clientId;
    const clientSecret = config.sellsy?.clientSecret;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Sellsy credentials");
    }

    const tokenKey = `sellsy_access_token_${clientId}`;
    const expiryKey = `sellsy_token_expiry_${clientId}`;

    let token = localStorage.getItem(tokenKey);
    const expiry = localStorage.getItem(expiryKey);

    if (forceRefresh || !token || !expiry || Date.now() > parseInt(expiry)) {
        try {
            // Use supabase function for auth
            const { data, error } = await supabase.functions.invoke('sellsy-auth', {
                body: { clientId, clientSecret }
            });

            if (error || !data?.access_token) {
                console.error('Sellsy Auth Error:', error || data);
                throw new Error("Failed to authenticate with Sellsy");
            }

            token = data.access_token;
            localStorage.setItem(tokenKey, token!);
            localStorage.setItem(expiryKey, (Date.now() + (data.expires_in * 1000)).toString());
        } catch (err) {
            console.error('Auth Exception:', err);
            throw err;
        }
    }

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    headers.append('Content-Type', 'application/json');
    headers.append('Accept', 'application/json');

    return headers;
};

export const searchClients = async (query: string): Promise<SellsyClient[]> => {
    const config = getConfig();

    // REAL API CALL
    const performSearch = async (retry = false): Promise<SellsyClient[]> => {
        try {
            const headers = await getHeaders(config, retry);

            // Use global search for broader matching (partial search)
            // The /search endpoint uses 'q' parameter for autocomplete-style search
            const response = await fetch(getApiUrl(`/search?q=${encodeURIComponent(query)}&limit=100`), {
                method: 'GET',
                headers: headers
            });

            if (response.status === 401 && !retry) {
                return performSearch(true);
            }

            if (!response.ok) {
                console.error('Sellsy Client Search Error:', response.status);
                const text = await response.text();
                console.error('Sellsy Client Search Response:', text);
                return [];
            }

            const data = await response.json();
            console.log('Sellsy Client Search Raw Data:', data); // DEBUG LOG

            const results: SellsyClient[] = [];

            if (data.data && Array.isArray(data.data)) {
                for (const item of data.data) {
                    // console.log('Processing item:', item); // DEBUG LOG
                    let client: SellsyClient | null = null;

                    // The search result structure in Sellsy v2 usually wraps the object
                    // item.type tells us what it is
                    // item.company or item.individual contains the data

                    if (item.type === 'company' && item.company) {
                        client = {
                            id: item.company.id,
                            name: item.company.name,
                            type: 'corporation',
                            email: item.company.email,
                            contactId: item.company.main_contact_id
                        };
                    }
                    else if (item.type === 'individual' && item.individual) {
                        client = {
                            id: item.individual.id,
                            name: `${item.individual.first_name || ''} ${item.individual.last_name || ''}`.trim(),
                            type: 'person',
                            email: item.individual.email
                        };
                    }
                    // Fallback for flat structure if API behaves differently
                    else if (item.type === 'company') {
                        client = {
                            id: item.id,
                            name: item.name,
                            type: 'corporation',
                            email: item.email
                        };
                    }
                    else if (item.type === 'individual') {
                        client = {
                            id: item.id,
                            name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
                            type: 'person',
                            email: item.email
                        };
                    }

                    if (client) {
                        results.push(client);
                    }
                }
            }

            console.log('Sellsy Client Search Processed Results:', results); // DEBUG LOG
            return results;

        } catch (error) {
            console.error('Sellsy Search Error:', error);
            return [];
        }
    };

    return performSearch();
};

export const checkConnection = async (): Promise<{ success: boolean; message: string }> => {
    const config = getConfig();
    if (!config.sellsy?.clientId) {
        return { success: false, message: "Client ID manquant" };
    }

    try {
        const headers = await getHeaders(config);
        // Try a simple search to verify connectivity
        // Pagination must be in query params, not body
        const response = await fetch(getApiUrl('/companies/search?limit=1'), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                filters: {}
            })
        });

        if (response.ok) {
            return { success: true, message: "Connecté à Sellsy" };
        } else {
            const text = await response.text();
            return { success: false, message: `Erreur API: ${response.status} ${text}` };
        }
    } catch (error: any) {
        return { success: false, message: `Erreur: ${error.message || 'Inconnue'}` };
    }
};

export const searchItems = async (query: string): Promise<SellsyItem[]> => {
    const config = getConfig();

    // REAL API CALL
    const performSearch = async (retry = false): Promise<SellsyItem[]> => {
        try {
            const headers = await getHeaders(config, retry);

            // Note: Sellsy API v2 ItemFilters does not support 'name' or 'search'.
            // We must fetch items and filter client-side.
            // We use empty filters to get ALL types (products, services, etc.)
            // Pagination must be in query params
            const response = await fetch(getApiUrl('/items/search?limit=100'), {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    filters: {}
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
            const allItems = (data.data || [])
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    unitAmount: item.sale_price?.amount || '0',
                    unit: item.unit?.label || ''
                }))
                .filter((item: any) => item.name && item.name.trim() !== ''); // Filter out items without names

            console.log(`Sellsy Catalog: Fetched ${allItems.length} valid items from API.`);

            // Client-side filtering
            if (!query) return allItems;
            const lowerQuery = query.toLowerCase();
            const filtered = allItems.filter((item: any) =>
                item.name?.toLowerCase().includes(lowerQuery)
            );
            console.log(`Sellsy Catalog: Filtered to ${filtered.length} items for query "${query}".`);
            return filtered;

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
        console.warn("Sellsy Client ID missing in config");
        return null;
    }

    // Real implementation would go here
    return null;
};

// Helper to get taxes
const getTaxes = async (config: GlobalConfig): Promise<{ id: number; rate: number; label: string }[]> => {
    try {
        const headers = await getHeaders(config);
        const response = await fetch(getApiUrl('/taxes'), {
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
    const taxes = await getTaxes(config);
    const tax = taxes.find(t => Math.abs(t.rate - rate) < 0.1);
    return tax ? tax.id : 0;
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
                console.warn("Sellsy Client ID missing in config");
                throw new Error("Sellsy configuration missing");
            }

            // Real API Call
            const headers = await getHeaders(config, retry);
            console.log('Sending Sellsy Payload:', JSON.stringify(estimate, null, 2));

            const response = await fetch(getApiUrl('/estimates'), {
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

            const response = await fetch(getApiUrl('/estimates'), {
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
