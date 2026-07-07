# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /backend
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY backend/ ./
RUN pnpm exec prisma generate
RUN pnpm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy backend build + dependencies
COPY --from=backend-build /backend/dist ./dist
COPY --from=backend-build /backend/node_modules ./node_modules
COPY --from=backend-build /backend/package.json ./
COPY --from=backend-build /backend/prisma ./prisma

# Copy frontend build as public static files
COPY --from=frontend-build /frontend/dist ./public

# Uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
