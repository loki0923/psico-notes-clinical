# Multi-stage Dockerfile para Psico Notes Clinical
# Diseñado con principios de Seguridad Médica OWASP y ejecución con usuario no-root

# Etapa 1: Build y compilación de artefactos
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx vite build

# Etapa 2: Imagen final de producción ligera y endurecida
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Usuario no privilegiado (OWASP Container Hardening)
RUN addgroup -S psiconotes && adduser -S psiconotes -G psiconotes

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar artefactos y código de la aplicación
COPY --chown=psiconotes:psiconotes --from=builder /app/dist ./dist
COPY --chown=psiconotes:psiconotes server.js db.js ./
COPY --chown=psiconotes:psiconotes *.html *.js *.css *.png manifest.json ./
RUN mkdir -p data && chown -R psiconotes:psiconotes data

USER psiconotes

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
