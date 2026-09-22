FROM node:22

WORKDIR /app

# Instalar build essentials para robotjs
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copiar package.json y package-lock.json
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar dependencias frontend
RUN npm ci

# Instalar dependencias backend
RUN cd server && npm ci && cd ..

# Copiar código fuente
COPY . .

# Construir frontend
RUN npm run build

# Exponer puerto
EXPOSE 5000

# Comando de inicio
CMD ["node", "server/server.js"]
