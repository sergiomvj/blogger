import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Credenciais do Supabase não encontradas. O sistema pode falhar se tentar usar o Supabase.');
}

// Cliente para o Backend (Service Role - Bypass RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Duck-typing para manter compatibilidade com o pool do mysql2 enquanto migramos
// Isso permite que o código que usa 'pool.query' continue funcionando ou nos dê um erro claro
export const pool = {
    query: async (sql, params) => {
        console.warn('⚠️ Chamada legada ao pool.query detectada. Migre para o cliente Supabase.');
        throw new Error('MySQL Pool is deprecated. Use Supabase client.');
    }
};

console.log('🚀 Supabase Service initialized');
