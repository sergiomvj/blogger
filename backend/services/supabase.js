import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltam credenciais do Supabase no .env');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Log de status
console.log('✅ Cliente Supabase inicializado');
