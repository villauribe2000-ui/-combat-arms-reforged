FROM node:22-alpine

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar dependencias
RUN npm install
RUN cd server && npm install && cd ..

# Copiar código fuente
COPY . .

# Construir frontend
RUN npm run build

# Exponer puerto
EXPOSE 5000

# Comando de inicio
CMD ["node", "server/server.js"]
