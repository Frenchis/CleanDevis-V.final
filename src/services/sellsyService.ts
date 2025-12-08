import { ProjectData, SellsyClient, SellsyEstimate, SellsyEstimateLine, GlobalConfig, Phase, SellsyItem } from '../types';
import { getConfig } from './calculationService';
import { supabase } from '../lib/supabaseClient';

// Helper to determine API URL based on environment
const getApiUrl = (endpoint: string) => {
    // Check if running in browser environment
    const isBrowser = typeof window !== 'undefined';

    // Safely check for Vite Dev mode
    const isDev = isBrowser && (import.meta as any)?.env?.DEV;

    if (isDev) {
        return `/api/sellsy${endpoint}`;
    }

    // In production (Vercel), use the serverless proxy function
    if (isBrowser) {
        return `/api/proxy?endpoint=${encodeURIComponent(endpoint)}`;
    }

    // In Node.js testing environment, verify if we should hit real API directly
    return `https://api.sellsy.com/v2${endpoint}`;
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
export const getHeaders = async (config: GlobalConfig, forceRefresh = false): Promise<Headers> => {
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

                    // The search result structure in Sellsy v2:
                    // item.object.type tells us what it is ('company', 'individual', etc.)
                    // The properties (name, email, etc.) are at the top level of the item.

                    const type = item.object?.type;

                    if (type === 'company') {
                        client = {
                            id: item.object.id,
                            name: item.name || "Nom inconnu",
                            type: 'corporation',
                            email: item.email,
                            contactId: item.main_contact_id
                        };
                    }
                    else if (type === 'individual') {
                        client = {
                            id: item.object.id,
                            name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.name || "Nom inconnu",
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

const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '');
};


import { buildEstimatePayload } from './sellsyPayloadBuilder';
import { BreakdownItem } from '../types';

export const createEstimate = async (project: ProjectData, clientId: string, breakdown?: BreakdownItem[]): Promise<{ id: number, publicLink?: string } | null> => {
    const config = getConfig();
    const solution = project.selectedSolution;

    if (!solution) throw new Error("Aucune solution sélectionnée pour le devis");

    const performCreate = async (retry = false): Promise<{ id: number, publicLink?: string } | null> => {
        try {

            const estimate = await buildEstimatePayload(project, clientId, config, breakdown);

            // Fetch taxes if possible to correct the tax_id (Optional enhancement: Update estimate with real tax Ids)
            // But since buildEstimatePayload is now pure, we might need to inject taxId or update lines here.
            // For now, let's keep it simple as before (taxId 0 was used in fallback or inside logic).
            // Actually, in the previous code I had getTaxId call inside buildEstimatePayload.
            // In the new file I removed getTaxId to avoid dependency.
            // So we should ideally map tax_id here.

            // Re-fetch tax ID here to be correct
            let taxId = 0;
            if (config.sellsy?.clientId) {
                try {
                    taxId = await getTaxId(config, 20);
                } catch (e) { console.warn("Could not fetch tax ID"); }
            }

            // Update tax_id in rows if we found one
            if (taxId !== 0) {
                estimate.rows = estimate.rows.map(row => {
                    if ((row.type === 'single') && row.tax_id === 0) {
                        return { ...row, tax_id: taxId };
                    }
                    return row;
                });
            }


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
                // We might need to ensure token refresh happens before retry if it was the issue
                // The getHeaders(forceRefresh=true) is usually called inside the retry logic if structured that way
                return performCreate(true);
            }

            if (!response.ok) {
                const errorText = await response.text();
                // console.error("Sellsy API Error:", errorText);
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

export const updateEstimate = async (estimateId: number, project: ProjectData, clientId: string, breakdown?: BreakdownItem[]): Promise<{ id: number, publicLink?: string } | null> => {
    const config = getConfig();
    const solution = project.selectedSolution;

    if (!solution) throw new Error("Aucune solution sélectionnée pour le devis");

    const performUpdate = async (retry = false): Promise<{ id: number, publicLink?: string } | null> => {
        try {
            const estimate = await buildEstimatePayload(project, clientId, config, breakdown);

            // Re-fetch tax ID here to be correct (Same logic as create)
            let taxId = 0;
            if (config.sellsy?.clientId) {
                try {
                    taxId = await getTaxId(config, 20);
                } catch (e) { console.warn("Could not fetch tax ID"); }
            }

            if (taxId !== 0) {
                estimate.rows = estimate.rows.map(row => {
                    if ((row.type === 'single') && row.tax_id === 0) {
                        return { ...row, tax_id: taxId };
                    }
                    return row;
                });
            }

            if (!config.sellsy?.clientId) {
                throw new Error("Sellsy configuration missing");
            }

            const headers = await getHeaders(config, retry);
            console.log(`Updating Estimate ${estimateId}. Payload:`, JSON.stringify(estimate, null, 2));

            const response = await fetch(getApiUrl(`/estimates/${estimateId}`), {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(estimate)
            });

            if (response.status === 401 && !retry) {
                console.warn('Sellsy Token expired or invalid. Retrying update...');
                return performUpdate(true);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Sellsy Update Error:", errorText);
                throw new Error(`Erreur Mise à jour Sellsy: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return {
                id: data.id,
                publicLink: data.public_link
            };
        } catch (error) {
            console.error('Sellsy Update Estimate Error:', error);
            throw error;
        }
    };

    return performUpdate();
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

            // Subject is no longer added as a line item
            // if (subject) { ... }

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
