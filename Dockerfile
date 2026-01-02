FROM node:20-slim

WORKDIR /app

# Somente as dependências do BACKEND para evitar conflitos com o frontend (recharts/react)
COPY backend/package*.json ./

# Usamos --legacy-peer-deps por segurança contra conflitos de peer dependencies
RUN npm install --production --legacy-peer-deps

# Copia o código do backend
COPY backend/ ./

EXPOSE 3001

# Executa migração e inicia o servidor
# Usamos node diretamente para garantir que funcione sem depender de scripts do package.json se necessário
CMD ["sh", "-c", "node migrate.js && node index.js"]
