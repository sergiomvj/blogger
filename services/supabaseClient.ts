import { createClient } from '@supabase/supabase-js';

// Support both Vite standard (import.meta.env) and potential process.env fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY : '');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase Credentials missing! Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Regular client for normal operations
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Admin client for admin operations (user management)
// WARNING: Service role key should NEVER be exposed in production frontend!
// This should only be used in development or moved to backend API
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl || '', supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : supabase; // Fallback to regular client if no service key
