# AutoWriter Multisite – Arquitetura Geral

## 1. Visão Arquitetural

O **AutoWriter Multisite** é uma plataforma editorial automatizada composta por dois blocos principais e serviços externos, desenhada para alta confiabilidade, escalabilidade e controle editorial.

A arquitetura segue o princípio de **separação total entre geração e publicação**, reduzindo riscos operacionais no WordPress.

---

## 2. Componentes do Sistema

### 2.1 WordPress Multisite (Camada de Publicação)

- Plugin **network-activated**
- Responsável exclusivamente por:
  - Criar posts (Draft)
  - Criar/associar categorias e taxonomias
  - Inserir imagens na Media Library
  - Integrar com plugins de SEO
  - Registrar logs e status

> ❗ Nenhuma chamada direta a LLM ou geração pesada ocorre dentro do WordPress.

---

### 2.2 Dashboard Central (Camada de Orquestração)

Aplicação externa responsável por todo o processamento pesado.

Funções principais:

- Upload e validação do CSV
- Tradução semântica do input
- Execução do pipeline de IA
- Geração de imagens via API externa
- Controle de filas, retries e custos
- Envio de payloads finais ao WordPress

Tecnologias possíveis:
- PHP 8.2+
- Node.js
- Python (FastAPI / Django)

---

### 2.3 Serviços Externos

- **LLM (Texto)** – geração de conteúdo
- **API de Keywords** – clusterização e SEO
- **API de Imagens** – geração visual
- **Storage externo** – backup de payloads e imagens

---

## 3. Fluxo de Dados (Alto Nível)

```text
CSV (PT)
  ↓
Dashboard Central
  ↓  (IA + SEO + Imagens)
Payload Final
  ↓  (REST API autenticada)
WordPress Multisite
  ↓
Post em Draft + Mídia + SEO
```

---

## 4. Comunicação entre Sistemas

### 4.1 Autenticação

- WordPress Application Password
- Nonce + assinatura HMAC (opcional)
- Restrição por IP (recomendado)

---

### 4.2 Endpoints Utilizados

- `/wp-json/wp/v2/posts`
- `/wp-json/wp/v2/media`
- `/wp-json/wp/v2/categories`
- `/wp-json/autowriter/v1/jobs`

---

## 5. Estratégia Multisite

- `blog_id` resolvido pelo Dashboard
- Publicação direcionada via REST para o site correto
- Plugin não decide destino — apenas executa

Benefícios:
- Controle central
- Menos lógica dentro do WP
- Fácil expansão futura

---

## 6. Princípios Arquiteturais

- Fail-safe por padrão
- Processamento assíncrono
- Logs imutáveis
- Reprocessamento granular
- Compatibilidade total com ecossistema WP

---

## 7. Evolução Planejada

- Suporte a múltiplos Dashboards
- Balanceamento de carga por blog
- Versões de pipeline por cliente
- Publicação agendada automática

---

**Status:** Arquitetura validada e pronta para implementação.

