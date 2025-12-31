# Plano de Execução: AutoWriter Multisite

Este documento serve como guia de implementação para o sistema AutoWriter Multisite. Marque as etapas conforme forem concluídas.

## Fase 0: Preparação e Infraestrutura



- [x] **Configuração do Ambiente**
    - [x] Inicializar repositório git (estrutura monorepo: `/dashboard` e `/plugin`)
    - [x] Configurar ambiente local (Docker/Node/PHP) (Arquivos criados; Docker deve ser iniciado pelo usuário)
    - [x] Criar banco de dados PostgreSQL para o Dashboard (Configuração pronta em `docker-compose.yml`)

- [ ] **Configuração do WordPress** (Ação Manual Obrigatória)
    - [ ] Validar instalação WordPress Multisite
    - [ ] Criar usuário `autowriter-bot` com permissões de administrador
    - [ ] Gerar Application Password para o bot
    - [ ] Mapear IDs dos blogs (`blog_key` -> `blog_id`) e preencher em `dashboard/.env`

## Fase 1: Dashboard Central (Backend)

- [x] **Banco de Dados (PostgreSQL)**
    - [x] Implementar Extensões (`pgcrypto`) (Concluído)
    - [x] Conexão com Banco configurada (`src/server.ts`)
    - [x] Criar Tabela `batches` (Concluído)
    - [x] Criar Tabela `jobs` (Concluído)
    - [x] Criar Tabela `job_artifacts` (Outputs de cada step)
    - [x] Criar Tabela `llm_usage_events` (Rastreio de tokens/custos)
    - [x] Criar Tabelas de Pricing (`pricing_profiles`, `job_cost_estimates`)

- [x] **Módulo de Upload (CSV)**
    - [x] Implementar endpoint de upload (`/api/upload`)
    - [x] Implementar parser de CSV (`csv-parse`)
    - [x] Implementar validação de schema do CSV (colunas obrigatórias)

- [ ] **Pipeline de IA (Orquestrador)**
    - [ ] Implementar estrutura de Steps (T0 a T6 + T10)
    - [x] Integrar Client de LLM (OpenAI Provider implementado)
    - [x] Implementar **Repair System** (Auto-correção de JSON inválido com GPT-4o)
    - [ ] Implementar validação de Schemas de Saída (Zod/AJV)

- [ ] **Geração de Imagens**
    - [ ] Integrar API de Imagem (DALL-E 3 / Flux / Midjourney via API)
    - [ ] Implementar fallback para banco de imagens ou URL manual

- [ ] **Fila e Processamento**
    - [ ] Configurar Queue (Redis/Bull ou Polling no DB)
    - [ ] Implementar worker para processar jobs pendentes
    - [ ] Implementar lógica de Retries e Status (`failed`, `needs_review`)

## Fase 2: WordPress Plugin (Multisite)

- [x] **Estrutura do Plugin**
    - [x] Criar estrutura base do plugin
    - [x] Configurar como *Network Activated* (`autowriter-multisite.php`)
    - [x] Criar tabelas locais (`wp_autowriter_jobs`, `wp_autowriter_logs`) (`class-autowriter-activator.php`)

- [x] **API Endpoint (Receiver)**
    - [x] Registrar rota REST `/autowriter/v1/jobs` (`class-autowriter-api.php`)
    - [x] Implementar autenticação (Application Password / Bearer) (Nativo do WP REST API)
    - [x] Validar payload de entrada (Básico implementado)

- [ ] **Lógica de Criação de Post**
    - [ ] Implementar `switch_to_blog($blog_id)` para contexto correto
    - [ ] Implementar checagem de Idempotência (`idempotency_key`)
    - [ ] Criar/Buscar Categoria e Tags
    - [ ] Inserir Post como **Draft** (Título, Conteúdo, Excerpt)

- [ ] **Gerenciamento de Mídia**
    - [ ] Implementar download seguro de imagens (SSRF Protection)
    - [ ] Upload da *Featured Image* na biblioteca de mídia
    - [ ] Inserção da *Top Image* no conteúdo do post

- [ ] **Integração SEO**
    - [ ] Mapear campos para Yoast SEO
    - [ ] Mapear campos para RankMath
    - [ ] Gravar Meta Title e Meta Description

## Fase 3: Qualidade e Integração

- [ ] **Testes Ponta a Ponta (E2E)**
    - [ ] Executar fluxo completo: CSV -> Dashboard -> WP Draft
    - [ ] Verificar formatação do HTML no WordPress
    - [ ] Verificar atribuição correta de imagens e SEO

- [ ] **Sanitização e Segurança**
    - [ ] Validar sanitização HTML no plugin (`wp_kses`)
    - [ ] Verificar logs de auditoria no Dashboard e no WP

## Fase 4: Otimização (Pós-MVP)

- [ ] Implementar Internal Linking automático
- [ ] Implementar Scheduling de publicações
- [ ] Dashboard de Analytics de Custos
