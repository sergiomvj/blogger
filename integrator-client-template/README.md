# SmartBlog Client Core Template

Este é um boilerplate minimalista de um blog "Integrator-Ready", projetado para ser usado com o painel central SmartBlog.

## Características
- **Zero Config**: Usa SQLite (banco de dados em arquivo).
- **Segurança Nativa**: Autenticação via HMAC SHA256 integrada.
- **REST v1**: Implementa o fluxo de criação de posts do Hub.
- **Leve**: Escrito em Node.js puro com Express.

## Como Usar
1. Copie esta pasta para o seu servidor.
2. Instale as dependências: `npm install`
3. Inicie o servidor: `npm start`
4. Use a URL `http://seu-ip:4000/api/v1` no painel central.
5. Copie a `HMAC_SECRET` gerada no console para as configurações do site no Dashboard.
6. **Super User Padrão**: Usuário `admin` / Senha `admin123` (já pré-configurado).

## Estrutura
- `server.js`: Lógica core, Rotas API e Renderização básica.
- `blog.db`: Banco de dados SQLite persistente.
- `package.json`: Gestão de dependências.

## Endpoints Implementados
- `GET /v1/health`: Status do sistema.
- `POST /v1/posts`: Recebe e salva posts do Hub.
- `GET /v1/posts`: Lista posts salvos.
- `GET /v1/categories`: Lista categorias.
- `POST /v1/categories`: Cria nova categoria.
- `GET /`: Landing page básica renderizada pelo servidor.

Desenvolvido para máxima facilidade de implementação.
