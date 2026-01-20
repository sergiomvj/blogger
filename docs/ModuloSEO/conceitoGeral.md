Perfeito. Vou estruturar isso **como um componente funcional completo dentro do app**, pensado para **automação real de SEO editorial**, não checklist genérico.

A ideia é que esse módulo **alimente diretamente o gerador de artigos**, garantindo que cada conteúdo já nasça **SEO-ready**, mensurável e comparável no tempo.

---

# 🧠 **Componente: SEO Intelligence Engine (por Artigo)**

**Objetivo:**
Gerar, organizar e priorizar **palavras-chave, termos de cauda longa e intenções de busca** que sirvam como **input direto** para:

* Geração do artigo
* Estrutura de títulos (H1–H3)
* Meta tags
* Snippets
* Conteúdo semântico (LSI)
* Conteúdo auxiliar (FAQ, rich results)

---

## 🔷 1. Definição do Contexto SEO (Input Obrigatório)

Antes de qualquer keyword, o sistema precisa **contextualizar a busca**.

### Tarefas

* Definir **tema central do artigo**
* Definir **tipo de artigo**:

  * Informativo
  * Analítico
  * Comparativo
  * Tutorial
  * Opinião fundamentada
* Definir **estágio do funil**:

  * Awareness
  * Consideration
  * Decision
* Definir **idioma e região alvo**
* Definir **perfil do leitor** (iniciante, intermediário, avançado)

📌 *Sem isso, keyword research vira ruído.*

---

## 🔷 2. Geração da Palavra-Chave Primária

### Tarefas

* Gerar **1 palavra-chave principal**
* Validar:

  * Clareza semântica
  * Alinhamento com intenção de busca
  * Potencial de tráfego (estimado)
* Classificar a keyword:

  * Head term
  * Mid-tail
  * Long-tail

📌 Essa keyword **define o eixo do artigo** (H1, slug, meta title).

---

## 🔷 3. Mapeamento de Intenção de Busca (Search Intent)

Cada keyword deve ser classificada em:

* Informacional (“o que é”, “como funciona”)
* Navegacional
* Comercial
* Transacional
* Investigativa (comparações, prós/cons)

### Tarefas

* Associar **1 intenção principal**
* Associar **intenções secundárias**
* Marcar riscos de desalinhamento (ex: artigo informativo com keyword transacional)

📌 Isso evita artigos que **ranqueiam mal mesmo bem escritos**.

---

## 🔷 4. Geração de Palavras-Chave Secundárias (Clusters)

### Tarefas

* Gerar **5–15 keywords secundárias**
* Agrupar por:

  * Subtemas
  * Perguntas
  * Variações semânticas
* Indicar **em qual seção do artigo** cada termo deve aparecer

📌 Essas keywords alimentam **H2 e H3**.

---

## 🔷 5. Extração de Termos de Cauda Longa (Long-Tail)

### Tarefas

* Gerar **15–40 termos de cauda longa**
* Classificar por:

  * Baixa concorrência
  * Perguntas reais
  * Frases naturais de busca
* Indicar:

  * Uso em parágrafos
  * Uso em FAQs
  * Uso em snippets

Exemplos:

* “como X funciona na prática”
* “vale a pena X em 2026?”
* “X para iniciantes”
* “erro comum ao usar X”

📌 Long-tail é onde **conteúdo novo vence sites grandes**.

---

## 🔷 6. Termos Semânticos & LSI (Contextualização Profunda)

### Tarefas

* Gerar lista de:

  * Termos correlatos
  * Sinônimos
  * Conceitos técnicos associados
* Classificar:

  * Obrigatórios
  * Recomendados
* Mapear densidade natural (não keyword stuffing)

📌 Isso melhora **EEAT e topical authority**.

---

## 🔷 7. Perguntas Frequentes (SEO + UX)

### Tarefas

* Gerar **5–10 perguntas reais**
* Priorizar perguntas:

  * De People Also Ask
  * De buscas conversacionais
* Associar:

  * Resposta curta (snippet-friendly)
  * Resposta expandida (conteúdo)

📌 Alimenta **FAQ schema** e snippets.

---

## 🔷 8. Análise de Concorrência Semântica (Light)

*(sem scraping pesado – visão estratégica)*

### Tarefas

* Simular:

  * Quais tópicos concorrentes estão cobrindo
  * Quais estão ignorando
* Gerar:

  * “Oportunidades de diferenciação”
  * “Ângulos pouco explorados”

📌 Aqui nasce o **conteúdo melhor que a média**.

---

## 🔷 9. Estrutura SEO Recomendada para o Artigo

### Output automático

* Sugestão de:

  * H1 (1)
  * H2 (4–8)
  * H3 (variáveis)
* Mapeamento:

  * Qual keyword entra em qual heading

📌 Isso vira input direto do **Article Generator**.

---

## 🔷 10. Meta SEO (Obrigatório)

### Tarefas

* Gerar:

  * Meta title (≤ 60 caracteres)
  * Meta description (≤ 160)
* Gerar variações A/B
* Marcar:

  * Emoções acionadas
  * Palavra-chave incluída

---

## 🔷 11. Score de Qualidade SEO (Pré-Publicação)

### Métricas internas

* Cobertura semântica (%)
* Diversidade de keywords
* Alinhamento com intenção
* Profundidade do tema
* Risco de canibalização

📌 Esse score decide:

* Publicar
* Ajustar
* Regerar

---

## 🔷 12. Output Estruturado (para o App)

```json
{
  "primary_keyword": "",
  "search_intent": "",
  "secondary_keywords": [],
  "long_tail_keywords": [],
  "lsi_terms": [],
  "faq_questions": [],
  "content_outline": [],
  "meta": {
    "title": "",
    "description": ""
  },
  "seo_score": 0
}
```

---

## 🚀 Resultado Final

Com esse componente:

✅ O artigo **nasce otimizado**, não corrigido depois
✅ SEO vira **parte do motor**, não etapa manual
✅ Você consegue:

* Comparar artigos
* Simular performance
* Escolher modelos LLM pelo ROI
* Construir autoridade temática consistente

---




