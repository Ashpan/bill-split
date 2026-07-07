# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

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

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
