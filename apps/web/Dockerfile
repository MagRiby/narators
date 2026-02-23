# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# Stage 1 — PRUNER
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS pruner

WORKDIR /app

RUN npm install -g turbo@2 --prefer-offline

COPY . .

RUN turbo prune @hadith-explorer/web --docker


# ─────────────────────────────────────────────────────────────
# Stage 2 — DEPS
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json

RUN npm ci --frozen-lockfile


# ─────────────────────────────────────────────────────────────
# Stage 3 — BUILDER
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .

# Build-time env vars that get baked into the JS bundle.
# NEXT_PUBLIC_* values are inlined at build time — set them here
# or pass via --build-arg if they differ between environments.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# next build produces:
#   apps/web/.next/standalone/   ← self-contained server (output: 'standalone')
#   apps/web/.next/static/       ← hashed static assets
RUN npm run build --workspace=@hadith-explorer/web


# ─────────────────────────────────────────────────────────────
# Stage 4 — RUNNER
# Only the standalone output is copied — no source, no devDeps.
# Typical image size: ~150 MB vs ~1 GB for a naive full copy.
#
# Directory layout in the runner (WORKDIR /app):
#
#   apps/web/server.js            ← Next.js standalone entry point
#   apps/web/.next/static/        ← hashed static bundles
#   apps/web/public/              ← un-hashed public assets
#   node_modules/                 ← minimal traced deps
#   package.json                  ← root (for module resolution)
#
# The path "apps/web/server.js" comes from outputFileTracingRoot
# being set to the monorepo root in next.config.ts.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    # Tell Next.js standalone server which port to listen on
    PORT=3000 \
    # Disable Next.js telemetry inside containers
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# ── Standalone server bundle ──────────────────────────────────
# Copies the entire standalone folder which includes:
#   - apps/web/server.js
#   - a minimal node_modules/ (just what's needed at runtime)
#   - package.json files for module resolution
COPY --from=builder --chown=nextjs:nodejs \
     /app/apps/web/.next/standalone ./

# ── Static assets ─────────────────────────────────────────────
# Must live at apps/web/.next/static relative to the server entry
# (Next.js standalone expects them next to server.js in .next/static)
COPY --from=builder --chown=nextjs:nodejs \
     /app/apps/web/.next/static ./apps/web/.next/static

# ── Public folder ─────────────────────────────────────────────
COPY --from=builder --chown=nextjs:nodejs \
     /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# server.js is the Next.js standalone entry generated relative to the
# outputFileTracingRoot (monorepo root), so its path inside /app is:
CMD ["node", "apps/web/server.js"]
