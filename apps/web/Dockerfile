FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true


RUN corepack enable
RUN corepack prepare pnpm@11.3.0 --activate
WORKDIR /app


FROM base AS dependencies

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

COPY apps/web/package.json apps/web/package.json

COPY packages/*/package.json packages/

RUN pnpm install --frozen-lockfile


FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules

COPY . .

RUN pnpm --filter web build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public



EXPOSE 3000
CMD ["node", "apps/web/server.js"]