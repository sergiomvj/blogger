Perfeito. Abaixo está um **PRD completo e técnico** do **Módulo SEO Intelligence Engine**, já **pensado para uso máximo de automação via N8N**, explorando **ferramentas gratuitas (Google Keyword Planner, Google Trends)** e **APIs externas plugáveis**, sem dependência rígida de provedores pagos.

---

# 📄 **PRD — Módulo SEO Intelligence Engine**

**Versão:** 1.0
**Produto:** App de geração e gestão de artigos
**Objetivo do módulo:** Gerar automaticamente **guidelines completas de SEO por artigo**, incluindo **palavras-chave, termos de cauda longa, tendências, intenção de busca e estrutura editorial**, usando **fontes gratuitas + APIs externas**, com **orquestração via N8N**.

---

## 🎯 1. Objetivos do Módulo

### Objetivos Primários

* Automatizar **100% do processo de SEO pré-artigo**
* Reduzir dependência de ferramentas pagas
* Criar **inputs estruturados** para:

  * Gerador de artigos
  * Editor humano
  * Comparação de custo/qualidade entre LLMs

### Objetivos Secundários

* Criar histórico SEO por artigo
* Permitir evolução futura para ferramentas pagas (SEMrush, Ahrefs, etc.)
* Padronizar SEO entre múltiplos blogs/projetos

---

## 👥 2. Usuários do Módulo

* Editor de conteúdo
* Gestor de SEO
* Sistema automático (modo batch)
* Agentes de IA (via N8N)

---

## 🧩 3. Escopo Funcional

### O módulo deve:

✅ Aceitar um **tema base**
✅ Enriquecer automaticamente com dados reais
✅ Gerar **keywords, long-tail, tendências e estrutura**
✅ Produzir **output estruturado** para consumo por outros módulos

---

## 🧠 4. Fontes de Dados (Gratuitas + APIs)

### 4.1 Fontes Gratuitas (Obrigatórias)

#### Google Keyword Planner (via conta Google Ads)

* Volume estimado
* Concorrência (baixa/média/alta)
* Sugestões relacionadas

📌 **Uso via automação**:

* Requer conta Ads ativa (mesmo sem campanhas)
* Uso indireto via:

  * Export manual automatizado
  * APIs não-oficiais / wrappers
  * Input híbrido humano + IA

---

#### Google Trends (API pública não oficial)

* Popularidade relativa
* Tendência temporal
* Comparação entre termos
* Regionalidade

📌 **Uso via N8N**:

* HTTP Request → trends.google.com
* Ou bibliotecas intermediárias (pytrends via webhook)

---

### 4.2 APIs Externas Plugáveis (Opcional)

O sistema deve aceitar **provedores configuráveis**:

```json
{
  "provider": "external",
  "type": "seo",
  "name": "Semrush",
  "enabled": false,
  "api_key": null
}
```

Exemplos:

* SEMrush
* Ahrefs
* DataForSEO
* OpenRouter (para análise semântica)
* APIs próprias no futuro

📌 Nenhuma API externa deve ser **hardcoded**.

---

## 🔄 5. Arquitetura de Automação (N8N First)

### Princípio

➡️ **O app define regras**
➡️ **O N8N executa inteligência e coleta**

---

## 🧠 6. Fluxos Principais no N8N

---

### 🔷 Fluxo 1 — Inicialização SEO

**Trigger**

* Novo artigo criado
* Tema informado manualmente ou via batch

**Ações**

1. Normalizar tema
2. Detectar idioma e região
3. Classificar tipo de artigo
4. Criar contexto SEO base

---

### 🔷 Fluxo 2 — Keyword Discovery (Gratuito)

**Ações**

1. Gerar seed keywords (IA)
2. Consultar:

   * Google Keyword Planner (indireto)
   * Google Trends
3. Consolidar sugestões
4. Remover duplicações
5. Classificar:

   * Head
   * Mid-tail
   * Long-tail

---

### 🔷 Fluxo 3 — Análise de Tendências (Google Trends)

**Ações**

1. Avaliar:

   * Interesse ao longo do tempo
   * Crescimento ou queda
2. Marcar keywords como:

   * Evergreen
   * Tendência
   * Sazonal
3. Atribuir peso temporal

---

### 🔷 Fluxo 4 — Intenção de Busca (IA)

**Ações**

1. Classificar intenção:

   * Informacional
   * Comercial
   * Investigativa
2. Validar alinhamento com tipo de artigo
3. Sinalizar conflitos

---

### 🔷 Fluxo 5 — Geração de Long-Tail Keywords

**Ações**

1. Gerar perguntas naturais
2. Simular buscas conversacionais
3. Priorizar:

   * Baixa concorrência
   * Alta intenção
4. Classificar uso:

   * Conteúdo
   * FAQ
   * Snippet

---

### 🔷 Fluxo 6 — Termos Semânticos (LSI)

**Ações**

1. Análise semântica via LLM
2. Extração de:

   * Conceitos correlatos
   * Sinônimos
3. Classificação:

   * Obrigatório
   * Opcional

---

### 🔷 Fluxo 7 — Estrutura SEO do Artigo

**Ações**

1. Gerar outline SEO:

   * H1
   * H2
   * H3
2. Associar keywords a headings
3. Validar cobertura semântica

---

### 🔷 Fluxo 8 — Meta SEO + FAQ

**Ações**

1. Gerar:

   * Meta title
   * Meta description
2. Criar variações A/B
3. Gerar FAQs com foco em snippet

---

### 🔷 Fluxo 9 — Score SEO & Validação

**Ações**

1. Calcular score interno:

   * Diversidade
   * Intenção
   * Tendência
   * Profundidade
2. Classificar status:

   * Ready
   * Needs Review
   * Rework

---

## 🧱 7. Estrutura de Dados (Output Padrão)

```json
{
  "topic": "",
  "language": "pt-BR",
  "region": "BR",
  "primary_keyword": "",
  "search_intent": "",
  "keywords": {
    "secondary": [],
    "long_tail": [],
    "lsi": []
  },
  "trends": {
    "is_trending": true,
    "trend_score": 0.78,
    "seasonality": "low"
  },
  "outline": [],
  "faq": [],
  "meta": {
    "title": "",
    "description": ""
  },
  "seo_score": 87
}
```

---

## 🧠 8. Requisitos Não Funcionais

* Modular
* Escalável
* API-first
* Auditável (logs N8N)
* Reprocessável (re-run de fluxos)

---

## 🔐 9. Segurança & Compliance

* Chaves de API armazenadas com:

  * Vault
  * Env vars
* Logs sem dados sensíveis
* Rate limit configurável por provedor

---

## 🧭 10. Roadmap Evolutivo

### V1 (Atual)

* Google Trends
* Keyword Planner (indireto)
* IA semântica
* N8N como orquestrador

### V2

* APIs pagas opcionais
* Benchmark competitivo real
* Histórico de performance

### V3

* SEO preditivo
* Otimização pós-publicação automática

---

## ✅ Resultado Final

Com esse módulo:

✔ SEO deixa de ser manual
✔ Conteúdo nasce orientado por dados reais
✔ N8N vira **motor de inteligência editorial**
✔ APIs externas entram sem refatoração
✔ Você cria **autoridade temática escalável**

---

### Próximos passos possíveis:

1. **Diagramar fluxos N8N (evento → webhook → agentes)**
2. Criar **schemas Supabase**
3. Criar **UI do módulo SEO**
4. Integrar com **cálculo de custo por LLM**
5. Criar **modo batch (100+ artigos)**

👉 Diga qual camada você quer atacar agora.
