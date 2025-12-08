import { createClient } from '@supabase/supabase-js';

// Helper to safely get env vars
const getEnvVar = (key: string) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    // Fallback for Node.js tests if process.env is needed or just return undefined
    return undefined;
};

// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be statically analyzable by Vite
// But we also need to prevent crash in Node.js
// The trick is: Vite replaces "import.meta.env.VITE_VAR" as a string literal.
// So we must write it exactly like that.

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_SUPABASE_URL
    : 'https://placeholder.supabase.co';

const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    // Only warn in browser
    if (typeof window !== 'undefined') {
        console.warn('Supabase credentials missing or placeholder used. Auth will fail.');
    }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
