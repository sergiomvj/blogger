FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

# Run migration and then start the server
CMD ["sh", "-c", "npm run migrate && npm start"]
