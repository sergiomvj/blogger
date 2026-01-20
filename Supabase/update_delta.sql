-- ARQUIVO DE MIGRAÇÃO: UPDATE DELTA
-- Contém APENAS as modificações necessárias baseadas no seu schema atual.
-- Não recria tabelas que já existem.

-- 1. Habilitar Extensões (Segurança)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Atualizar Tabela 'settings' (Adicionar colunas faltantes)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS main_provider character varying DEFAULT 'openai';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS provider_openrouter_enabled boolean DEFAULT true;

-- 3. Recriar Funções e Triggers (Essenciais para o sistema funcionar)
-- O dump do Supabase muitas vezes não inclui triggers e functions, então recriamos aqui.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Funções de Estatísticas e Custos
CREATE OR REPLACE FUNCTION get_stats_summary()
RETURNS TABLE (total_articles BIGINT, total_input_tokens BIGINT, total_output_tokens BIGINT, total_cost_usd NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT j.id) as total_articles,
        COALESCE(SUM(u.input_tokens), 0)::BIGINT as total_input_tokens,
        COALESCE(SUM(u.output_tokens), 0)::BIGINT as total_output_tokens,
        SUM((u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) + (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0))::NUMERIC as total_cost_usd
    FROM jobs j LEFT JOIN llm_usage_events u ON j.id = u.job_id LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_stats_history()
RETURNS TABLE (date TEXT, llm NUMERIC, images INT) AS $$
BEGIN
    RETURN QUERY
    SELECT to_char(u.created_at, 'Mon DD') as date, SUM((u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) + (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0))::NUMERIC as llm, 0 as images
    FROM llm_usage_events u LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key WHERE u.created_at >= NOW() - INTERVAL '30 days' GROUP BY date, date_trunc('day', u.created_at) ORDER BY date_trunc('day', u.created_at) ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_stats_details()
RETURNS TABLE (label TEXT, provider TEXT, cost NUMERIC, unit_count BIGINT, unit_label TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT u.model_id as label, p.display_name as provider, SUM((u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) + (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0))::NUMERIC as cost, SUM(u.input_tokens + u.output_tokens)::BIGINT as unit_count, 'Tokens'::TEXT as unit_label
    FROM llm_usage_events u JOIN pricing_profiles p ON u.model_id = p.profile_key GROUP BY u.model_id, p.display_name ORDER BY cost DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_batch_cost(b_id UUID)
RETURNS TABLE (current_cost NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT SUM((u.input_tokens::NUMERIC / 1000000) * COALESCE(p.input_per_1m_tokens, 0) + (u.output_tokens::NUMERIC / 1000000) * COALESCE(p.output_per_1m_tokens, 0))::NUMERIC as current_cost
    FROM jobs j JOIN llm_usage_events u ON j.id = u.job_id LEFT JOIN pricing_profiles p ON u.model_id = p.profile_key WHERE j.batch_id = b_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Reaplicar Triggers de Atualização
DROP TRIGGER IF EXISTS update_blogs_updated_at ON blogs;
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON blogs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_pricing_profiles_updated_at ON pricing_profiles;
CREATE TRIGGER update_pricing_profiles_updated_at BEFORE UPDATE ON pricing_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_custom_prompts_updated_at ON custom_prompts;
CREATE TRIGGER update_custom_prompts_updated_at BEFORE UPDATE ON custom_prompts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_pre_articles_updated_at ON pre_articles;
CREATE TRIGGER update_pre_articles_updated_at BEFORE UPDATE ON pre_articles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Inserir Dados de Preço (Seed)
-- Apenas insere se não existir, evitando duplicatas.
INSERT INTO public.pricing_profiles (profile_key, display_name, input_per_1m_tokens, output_per_1m_tokens) 
VALUES 
('gpt-4o', 'GPT-4o (OpenAI)', 2.50, 10.00),
('gpt-4o-mini', 'GPT-4o Mini (OpenAI)', 0.15, 0.60),
('dall-e-3', 'DALL-E 3 (OpenAI)', 0, 0)
ON CONFLICT (profile_key) DO NOTHING;
