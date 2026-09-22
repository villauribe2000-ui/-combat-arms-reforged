FROM node:22

WORKDIR /app

# Instalar build essentials
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copiar package.json y package-lock.json
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar todas las dependencias
RUN npm ci --legacy-peer-deps

# Instalar dependencias backend
RUN cd server && npm ci --legacy-peer-deps && cd ..

# Copiar código fuente
COPY . .

# Construir frontend
RUN npm run build

# Exponer puerto
EXPOSE 5000

# Comando de inicio
CMD ["node", "server/server.js"]
