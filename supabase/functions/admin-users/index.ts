// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // 1. Gérer le CORS (Preflight)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Créer un client Supabase avec le contexte de l'utilisateur connecté
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization') } } }
        );

        // Vérifier si l'utilisateur est authentifié
        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            console.error("Unauthorized request");
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // Créer un client Admin (Service Role) pour les actions privilégiées
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const url = new URL(req.url);

        // Parsing STANDARD du body
        let body = {};
        try {
            // On essaie de lire le JSON seulement si ce n'est pas un GET
            if (req.method !== 'GET') {
                body = await req.json().catch(() => ({}));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }

        console.log("Received Body:", JSON.stringify(body));

        // Déterminer l'action
        const action = body.action || url.searchParams.get('action');

        console.log(`Request method: ${req.method}, Action: ${action}`);

        // --- ACTION: LISTER LES UTILISATEURS ---
        if (req.method === 'GET' || (req.method === 'POST' && action === 'list')) {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
            if (error) throw error;
            return new Response(JSON.stringify({ users }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // --- ACTION: CRÉER UN UTILISATEUR ---
        if (req.method === 'POST' && action === 'create') {
            const { email, password } = body;

            if (!email || !password) {
                console.error("Missing email or password");
                return new Response(JSON.stringify({ error: 'Email and password required' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                });
            }

            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true // Auto confirm
            });

            if (error) {
                console.error("Create User Error:", error);
                throw error;
            }

            return new Response(JSON.stringify({ user: data.user }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // --- ACTION: DECONNECTER (LOGOUT) UN UTILISATEUR ---
        if (req.method === 'POST' && action === 'logout') {
            const { userId } = body;
            if (!userId) {
                console.error("Missing userId");
                return new Response(JSON.stringify({ error: 'User ID required' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                });
            }

            const { error } = await supabaseAdmin.auth.admin.signOut(userId, { scope: 'global' });

            if (error) {
                console.error("Logout User Error:", error);
                throw error;
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // --- ACTION: SUPPRIMER UN UTILISATEUR ---
        if (req.method === 'DELETE') {
            const { userId } = body;
            if (!userId) {
                console.error("Missing userId");
                return new Response(JSON.stringify({ error: 'User ID required' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                });
            }

            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: `Method not allowed or unknown action: ${action}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
