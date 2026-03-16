# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY tsconfig.base.json ./

RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY packages/types ./packages/types
COPY packages/shared ./packages/shared
COPY packages/eslint-config ./packages/eslint-config

# Build
RUN npm run build --workspace=apps/api

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/eslint-config/package*.json ./packages/eslint-config/

RUN npm ci --omit=dev --workspace=apps/api && \
    npm cache clean --force

# Copy built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy necessary files
COPY apps/api/database ./apps/api/database
COPY apps/api/package.json ./apps/api/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -D -H -h /app -s /sbin/nologin -G nodejs -u 1001 nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/app.js"]