FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/*/package.json packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter qube-js build \
  && pnpm --filter api build \
  && pnpm --filter web build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV WEB_PORT=3001
RUN apk add --no-cache dumb-init postgresql-client
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY --from=builder /app/apps/api/src/db/schema ./apps/api/src/db/schema
COPY --from=builder /app/packages ./packages
COPY scripts/run-qube-container.cjs ./scripts/run-qube-container.cjs
COPY scripts/run-qube-migrations.cjs ./scripts/run-qube-migrations.cjs
RUN chown -R node:node /app
USER node
EXPOSE 3000 3001
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "/app/scripts/run-qube-container.cjs"]
