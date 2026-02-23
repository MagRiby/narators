# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# Stage 1 — PRUNER
# Uses Turborepo to extract only the files & package.jsons that
# @hadith-explorer/api needs. Keeps later stages small and their
# layer cache valid even when other apps in the monorepo change.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS pruner

WORKDIR /app

# Install turbo globally (fast — only the CLI, no devDeps)
RUN npm install -g turbo@2 --prefer-offline

# Copy the entire monorepo (respects .dockerignore at the repo root)
COPY . .

# Prune to only what the API workspace needs.
# --docker produces:
#   out/json/  — package.json files only  (for npm install layer caching)
#   out/full/  — full source tree
#   out/package-lock.json
RUN turbo prune @hadith-explorer/api --docker


# ─────────────────────────────────────────────────────────────
# Stage 2 — DEPS
# Install npm dependencies against the pruned lock file.
# This layer is cached as long as package*.json files don't change.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only the pruned package.json files (triggers cache miss only
# when a dependency version changes, not when source code changes)
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json

RUN npm ci --frozen-lockfile


# ─────────────────────────────────────────────────────────────
# Stage 3 — BUILDER
# Generate the Prisma client and compile TypeScript.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Bring in installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Bring in the full pruned source (apps/api + packages/database)
COPY --from=pruner /app/out/full/ .

# Generate Prisma client into node_modules/.prisma/client
# (Must run in-container so the binary matches the runner OS/arch)
RUN node_modules/.bin/prisma generate \
      --schema=packages/database/prisma/schema.prisma

# Compile TypeScript → dist/
RUN npm run build --workspace=@hadith-explorer/api


# ─────────────────────────────────────────────────────────────
# Stage 4 — RUNNER
# Minimal production image: compiled JS + runtime node_modules only.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs expressjs

# Compiled application
COPY --from=builder --chown=expressjs:nodejs /app/apps/api/dist ./dist

# Runtime dependencies (includes .prisma/client with the generated binary)
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules

# Prisma schema + migrations (prisma migrate deploy reads these at startup)
COPY --from=builder --chown=expressjs:nodejs \
     /app/packages/database/prisma ./prisma

# Root package.json (needed for Node workspace module resolution)
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./package.json

# Entrypoint script (runs migrations then starts the server)
COPY --chown=expressjs:nodejs apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER expressjs

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
