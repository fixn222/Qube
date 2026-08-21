FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app


FROM base AS dependencies

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

COPY apps/api/package.json apps/api/package.json

COPY packages/*/package.json packages/

RUN pnpm install --frozen-lockfile


FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules

COPY . .

RUN pnpm --filter api build


FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["pnpm", "start"]