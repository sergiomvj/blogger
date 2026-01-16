import { supabase } from './services/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateSupabase() {
  try {
    console.log('🚀 Iniciando migração para Supabase/PostgreSQL...');

    const sqlPath = path.join(__dirname, 'supabase_migration.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error('Arquivo supabase_migration.sql não encontrado!');
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // O Supabase MCP ou o cliente JS não têm um método "exec" genérico para rodar SQL puro de forma fácil via REST.
    // Geralmente usamos migrações via CLI ou o Editor SQL.
    // No entanto, podemos tentar rodar via rpc se houver uma função auxiliar ou via query manager.

    console.log('📝 O script SQL foi gerado em: ' + sqlPath);
    console.log('⚠️ AVISO: O cliente @supabase/supabase-js não permite execução de DDL (CREATE TABLE) diretamente por segurança.');
    console.log('👉 Por favor, copie o conteúdo do arquivo "supabase_migration.sql" e cole no SQL Editor do seu painel Supabase.');

    // Tentativa de verificar conexão
    const { data, error } = await supabase.from('settings').select('*').limit(1);
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('❌ Erro de conexão com Supabase:', error.message);
    } else {
      console.log('✅ Conexão com Supabase verificada.');
    }

  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  }
}

migrateSupabase();
