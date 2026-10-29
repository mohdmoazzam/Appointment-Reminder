# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/api/Dockerfile .

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# postinstall runs `prisma generate`, so the schema and Prisma config must be in place first.
COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/src/common/database/prisma apps/api/src/common/database/prisma
# `prisma generate` doesn't connect, but the Prisma config needs a URL to load.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    pnpm install --frozen-lockfile --filter api...
COPY apps/api apps/api
RUN pnpm --filter api build
# Production dependencies only. The Prisma client is already compiled into dist.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter api deploy --prod --legacy --ignore-scripts /prod/api

# One-off job: apply pending migrations. Needs the Prisma CLI, which is a dev dependency.
FROM build AS migrate
WORKDIR /repo/apps/api
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /prod/api/package.json ./
COPY --from=build --chown=node:node /prod/api/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/main.js"]
