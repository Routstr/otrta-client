FROM node:23-slim AS base

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

# Install dependencies with platform targeting
RUN npm ci --platform=linux --arch=x64

# Explicitly install and rebuild LightningCSS for Linux
RUN npm install lightningcss --platform=linux --arch=x64 --force
RUN npm rebuild lightningcss

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments and convert to environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ENABLE_AUTHENTICATION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENABLE_AUTHENTICATION=$NEXT_PUBLIC_ENABLE_AUTHENTICATION

# Double-check LightningCSS binary exists and rebuild if needed
RUN if [ ! -f node_modules/lightningcss/lightningcss.linux-x64-gnu.node ]; then \
    echo "LightningCSS binary not found, rebuilding..."; \
    npm rebuild lightningcss --platform=linux --arch=x64; \
    fi

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
