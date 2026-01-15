# Plano de Implementação – AutoWriter Multisite v1.0

Este documento rastreia o progresso das funcionalidades necessárias para concluir a versão 1.0 do sistema.

---

## 🟢 Etapa 1: Base de Dados e Inteligência Financeira (Dashboard Real)
*Foco: Transformar o dashboard visual em uma ferramenta baseada em dados reais.*

- [x] **1.1 Integração de Dados Reais de Consumo**
    - [x] Substituir Mock Data em `CostOverview.tsx` por chamadas à API.
    - [x] Implementar agrupamento de custos por Batch/Blog no backend.
- [x] **1.2 Engine de Simulação de Custos (What-if Pricing)**
    - [x] Implementar lógica de cálculo de custos simulados no backend.
    - [x] Exibir comparação de provedores no detalhe do Job.
- [x] **1.3 Sistema de Alertas de Orçamento**
    - [x] Criar monitoramento de limite de custo por Batch.
    - [x] Implementar aviso visual/trava de segurança.

---

## 🟡 Etapa 2: Refinamento do Pipeline de IA (Qualidade Editorial)
*Foco: Garantir conteúdo SEO-ready com mínima intervenção.*

- [x] **2.1 Implementação de Internal Linking**
    - [x] Adicionar step `T13: Internal Links` no pipeline.
    - [x] Lógica para buscar posts via WP REST API e injetar links.
- [x] **2.2 Quality Gate Algorítmico (Hard Checks)**
    - [x] Verificação programática de contagem de palavras.
    - [x] Validação de hierarquia de tags HTML (H1-H3).
    - [x] Filtro de termos proibidos (Blacklist).
- [x] **2.3 Biblioteca e Editor de Prompts**
    - [x] Interface para edição de `TASK_PROMPTS` no dashboard.
    - [x] Persistência de prompts customizados no banco de dados.

---

## � Etapa 3: Personalização e Operação em Escala
*Foco: Dar "alma" editorial aos blogs e facilitar a gestão volumosa.*

- [x] **3.1 Presets Detalhados por Blog (Style Key)**
    - [x] Definição de Tons de Voz e CTAs específicos por site.
    - [x] Blacklist de termos por blog (Filtro geográfico/nicho).
- [x] **3.2 Galeria de Imagens Geradas (Gestão de Mídia)**
    - [x] Download automático de imagens do DALL-E para armazenamento local.
    - [x] Interface de galeria para reutilização de assets.
- [x] **3.3 Download de Artigo (Exportação JSON/HTML)**
    - [x] Opção de baixar o conteúdo offline após geração.

---

## 🟢 Etapa 4: Finalização do Ecossistema WordPress & Backup
*Foco: Portabilidade e integridade do plugin.*

- [x] **4.1 Fallback de SEO (JSON-LD)**
    - [x] Injeção de metadados SEO manuais quando Yoast/RankMath ausentes.
- [x] **4.2 Exportação de Backup em ZIP**
    - [x] Endpoint para baixar todos os artefatos de um Batch (JSON, MD, Audit).
- [x] **4.3 Notificações de Conclusão**
    - [x] Sistema de alerta visual quando um lote volumoso é finalizado.

---

## 📈 Status Geral do Projeto
- **Total de Subetapas:** 12
- **Concluídas:** 12
- **Progresso:** 100%

**Última Atualização:** 2026-01-14
