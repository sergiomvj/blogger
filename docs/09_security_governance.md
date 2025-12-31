# AutoWriter Multisite – Segurança, Governança e Auditoria

## 1. Objetivo

Definir medidas de segurança e governança para:
- proteger credenciais e chaves de API
- evitar abuso dos endpoints
- impedir ataques comuns (replay, SSRF, injeção)
- manter trilha de auditoria e backups confiáveis

---

## 2. Ameaças Principais (Threat Model)

### 2.1 Ameaças externas
- Replay de requisições ao WP
- Tentativa de publicar conteúdo indevido
- Ataques de força bruta em endpoints
- SSRF via URLs manuais de imagem

### 2.2 Ameaças internas
- Vazamento de API keys por logs
- Operador rodando CSV indevido
- Duplicação massiva (sem idempotência)

---

## 3. Autenticação e Autorização

## 3.1 WordPress Plugin Endpoints

### Camada 1: Application Password
- Usuário dedicado (ex.: `autowriter-bot`)
- Capability: `manage_network`
- Autenticação via HTTP Basic

### Camada 2: HMAC Signature (recomendado)
Headers:
- `X-AW-Timestamp`
- `X-AW-Signature`

Assinatura:
- `signature = HMAC_SHA256(secret, timestamp + raw_body)`

Regras:
- Janela de validade: 5 minutos
- Rejeitar timestamps fora da janela
- Comparação segura (timing-safe)

### Camada 3 (opcional): Allowlist IP
- aceitar apenas IP(s) do Dashboard

---

## 3.2 Dashboard

- Login por usuário/senha
- Sessão (cookies httpOnly) ou JWT
- 2FA (recomendado em v1.1)

---

## 4. Gestão de Segredos

### 4.1 Onde guardar chaves

- Dashboard:
  - `.env` em servidor seguro
  - preferencial: vault/secret manager

- WordPress:
  - `wp-config.php` para HMAC secret (melhor)
  - settings no network admin (somente se criptografado)

### 4.2 Rotação

- Suportar múltiplas chaves ativas por período (key ring)
- Rotação mensal (recomendado)

---

## 5. Proteções contra Replay e Tampering

- HMAC + timestamp
- Idempotency key obrigatória
- Registrar hash do payload no WP

---

## 6. Proteção SSRF (URLs manuais)

Quando baixar imagens via URL:

- Bloquear IPs privados/reservados:
  - 127.0.0.0/8
  - 10.0.0.0/8
  - 172.16.0.0/12
  - 192.168.0.0/16
  - link-local / multicast
- Resolver DNS e validar IP final
- Permitir apenas http/https
- Limitar redirects (ex.: 2)
- Limitar tamanho máximo do download (ex.: 10MB)

Opcional (mais seguro):
- Allowlist de domínios para manual URL

---

## 7. Rate Limiting e Proteção Anti-Abuso

### 7.1 No WordPress

- Rate limit por minuto para endpoints do plugin
- Bloquear bursts (ex.: 30 req/min)

### 7.2 No Dashboard

- Limitar jobs simultâneos
- Controle de concorrência por blog

---

## 8. Sanitização e Segurança de Conteúdo

### 8.1 HTML Content

- Sanitizar HTML antes de enviar ao WP (Dashboard)
- No WP, aplicar validação adicional:
  - remover scripts
  - remover iframes (exceto allowlist)

### 8.2 CSV Input

- Escapar e normalizar valores
- Tratar aspas corretamente

---

## 9. Auditoria e Logs

### 9.1 O que logar

- job_id
- blog_id
- idempotency_key
- providers utilizados
- tempo por etapa
- status e erros

### 9.2 O que NÃO logar

- API keys
- prompts completos se contiverem dados sensíveis (opcional)

### 9.3 Imutabilidade

- logs append-only
- evitar update do conteúdo do log

---

## 10. Backups e Retenção

### 10.1 Artefatos por job

- payload.json
- post.md
- audit.json
- imagens (originais)

### 10.2 Retenção

- MVP: 90 dias
- v1.1: políticas por blog (30/90/365)

### 10.3 Backup offsite

- S3-compatible
- versioning habilitado

---

## 11. Permissões no Multisite

- Apenas Network Admin pode:
  - alterar settings
  - gerar application password
  - acessar logs

- Usuário `autowriter-bot`:
  - mínimo necessário
  - sem acesso ao admin UI

---

## 12. Compliance Editorial (Governança)

- Blacklist terms por blog
- Regras para claims sensíveis
- `needs_review` obrigatório para alertas
- Presets de tom por site

---

## 13. Checklist de Segurança (MVP)

- [ ] Application Password user dedicado
- [ ] HMAC habilitado
- [ ] Rate limiting
- [ ] Idempotência obrigatória
- [ ] SSRF protection para URLs
- [ ] Logs sem segredos
- [ ] Backup offsite

---

**Status:** Segurança e governança definidas para MVP e escaláveis para v1.1+.

