// @ts-nocheck
const SELLSY_AUTH_URL = 'https://login.sellsy.com/oauth2/access-tokens';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get secrets from environment
        const clientId = Deno.env.get('SELLSY_CLIENT_ID');
        const clientSecret = Deno.env.get('SELLSY_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
            console.error('Missing Sellsy credentials');
            return new Response(
                JSON.stringify({ error: 'Configuration error: Missing Sellsy credentials on server' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const body = new URLSearchParams();
        body.append('grant_type', 'client_credentials');
        body.append('client_id', clientId);
        body.append('client_secret', clientSecret);

        console.log('Requesting Sellsy Token...');

        const response = await fetch(SELLSY_AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Sellsy API Error:', data);
            return new Response(JSON.stringify(data), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
