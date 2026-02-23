#!/bin/sh
# entrypoint.sh — runs inside the API container before the Node process starts.
# Applies any pending Prisma migrations then hands off to the server.
set -e

echo "▶ Running Prisma migrations..."
# prisma CLI is available via the copied node_modules
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "▶ Starting API server..."
exec node dist/index.js
