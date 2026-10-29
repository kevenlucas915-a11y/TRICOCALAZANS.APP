# Imagem base leve com Node.js 20 LTS
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala todas as dependências para compilar frontend e backend
RUN npm ci

# Copia o código fonte do projeto
COPY . .

# Compila o frontend (Vite) e o backend (esbuild -> server.js)
RUN npm run build

# Imagem de produção otimizada
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia package.json e instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia os artefatos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Expõe a porta padrão
EXPOSE 3000

# Inicia o servidor Node.js
CMD ["node", "server.js"]
