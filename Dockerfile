# ===================================================
# STAGE 1: Instalación de dependencias (deps)
# ===================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Dependencias del sistema requeridas por Prisma y Alpine
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@9

# Variable de entorno de respaldo para que Prisma 7 valide prisma.config.ts
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interlocapp?sslmode=disable"

# Copiar manifiestos, workspace y esquema Prisma (necesario para el postinstall de Prisma)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar dependencias exactas según el lockfile
RUN pnpm install --frozen-lockfile

# ===================================================
# STAGE 2: Compilación de la aplicación (builder)
# ===================================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos requeridos en tiempo de build para inyectar en el bundle del cliente
ARG NEXT_PUBLIC_PUSHER_KEY
ARG NEXT_PUBLIC_PUSHER_CLUSTER
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_PUBLIC_PUSHER_KEY=$NEXT_PUBLIC_PUSHER_KEY
ENV NEXT_PUBLIC_PUSHER_CLUSTER=$NEXT_PUBLIC_PUSHER_CLUSTER
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Variable de entorno ficticia requerida para la compilación estática de Next.js y Prisma
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interlocapp?sslmode=disable"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compilar Next.js (el cliente Prisma ya fue generado en la etapa deps)
RUN pnpm build

# Inyectar esm/ en @swc/helpers dentro de standalone (corrige bug de @vercel/nft que omite esm y crashea node server.js)
RUN node -e '\
  const fs = require("fs");\
  const path = require("path");\
  function findDirs(root, targetName, results = []) {\
    if (!fs.existsSync(root)) return results;\
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {\
      const fullPath = path.join(root, entry.name);\
      if (entry.isDirectory()) {\
        if (entry.name === targetName) results.push(fullPath);\
        findDirs(fullPath, targetName, results);\
      }\
    }\
    return results;\
  }\
  const esmSources = findDirs("/app/node_modules", "esm").filter(p => p.includes("@swc") && p.includes("helpers"));\
  if (esmSources.length > 0) {\
    const src = esmSources[0];\
    const standaloneHelpers = findDirs("/app/.next/standalone", "helpers").filter(p => p.includes("@swc"));\
    for (const target of standaloneHelpers) {\
      const destEsm = path.join(target, "esm");\
      if (!fs.existsSync(destEsm)) {\
        console.log("Inyectando esm en:", destEsm);\
        fs.cpSync(src, destEsm, { recursive: true });\
      }\
    }\
  }\
'

# ===================================================
# STAGE 3: Entorno de ejecución en producción (runner)
# ===================================================
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Endurecimiento: Usuario y grupo sin privilegios de root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos públicos estáticos
COPY --from=builder /app/public ./public

# Asignar permisos sobre el directorio de trabajo y caché
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copiar la aplicación empaquetada en modo standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

# Verificación de salud del contenedor adaptable al puerto asignado
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/ || exit 1

CMD ["node", "server.js"]
