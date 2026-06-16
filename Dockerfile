# ---- Global build arguments ----
# NODE:           Production Node.js image (pinned for reproducible builds).
#                 Override with a hardened image via --build-arg NODE=dhi.io/...
# NODE_BUILD:     Build-stage Node.js image. Always Alpine (needs shell for
#                 apk, adduser, etc.). Not overridden by CI.
# APP_UID/GID:    Non-root user/group IDs for container security
# APP_USERNAME:   Non-root username inside the container
# APP_GROUPNAME:  Non-root group name inside the container
# APP_DIR:        Working directory for all stages
# PORT:           Port the Next.js standalone server listens on
ARG NODE=node:24.14-alpine3.23
ARG NODE_BUILD=node:24.14-alpine3.23
ARG APP_UID=1001
ARG APP_GID=1001
ARG APP_USERNAME=container-user
ARG APP_GROUPNAME=container-group
ARG APP_DIR=/app
ARG PORT=3000

# ---- Base ----
# Alpine foundation for deps/builder stages (uses NODE_BUILD).
# OS packages (tzdata, dumb-init, ca-certificates) and the non-root user are
# created here, then COPY'd into the prod stage which may be distroless.
FROM ${NODE_BUILD} AS base
ARG APP_DIR
ARG APP_UID
ARG APP_GID
ARG APP_USERNAME
ARG APP_GROUPNAME

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR ${APP_DIR}

RUN apk add --no-cache tzdata dumb-init ca-certificates \
    && apk upgrade --no-cache \
    && cp /usr/share/zoneinfo/Asia/Singapore /etc/localtime \
    && echo "Asia/Singapore" > /etc/timezone \
    && addgroup -g ${APP_GID} ${APP_GROUPNAME} \
    && adduser -S -u ${APP_UID} -h ${APP_DIR} -s /sbin/nologin -G ${APP_GROUPNAME} ${APP_USERNAME}

# ---- Dependencies ----
# Installs ALL dependencies (including devDependencies) for the builder.
# Prod does NOT copy node_modules — Next.js standalone bundles what it needs.
FROM base AS deps
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ---- Builder ----
# Runs `next build` (standalone mode) + esbuild worker bundle.
# Produces server.js + .next/static + dist/worker.js for the prod stage.
FROM deps AS builder
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY ./ ./
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm run build && pnpm run build:worker; \
  elif [ -f yarn.lock ]; then yarn run build && yarn run build:worker; \
  elif [ -f package-lock.json ]; then npm run build && npm run build:worker; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Redirect the Next.js runtime cache (image optimizer output + ISR) to a
# writable location. The prod stage runs on a read-only root filesystem, so
# Next.js cannot create /app/.next/cache; /tmp is the writable mount (see the
# prod-prep stage). This symlink ships inside the standalone bundle that the
# prod stage COPYs into /app, so /app/.next/cache → /tmp/.next/cache at runtime.
RUN ln -sfn /tmp/.next/cache .next/standalone/.next/cache

# ---- Production prep ----
# Creates writable directories in Alpine so the distroless prod stage
# doesn't need any RUN commands.
FROM base AS prod-prep
ARG APP_UID
ARG APP_GID
RUN mkdir -p /tmp/.next/cache && chown -R ${APP_UID}:${APP_GID} /tmp/.next

# ---- Production ----
# Uses NODE (hardened/distroless when CI overrides, Alpine otherwise).
# No RUN commands — all setup via COPY from base/prod-prep/builder stages.
#
# dumb-init (PID 1) forwards SIGTERM for graceful shutdown.
# /tmp writable for Next.js cache; read-only compatible with ECS
# readonlyRootFilesystem: true.
FROM ${NODE} AS prod
ARG APP_UID
ARG APP_GID
ARG APP_DIR
ARG PORT

ENV NODE_ENV="production" \
    NODE_OPTIONS=--max-old-space-size=384 \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=${PORT} \
    HOSTNAME="0.0.0.0"

WORKDIR ${APP_DIR}

# OS-level setup from the Alpine base stage (user, timezone, certs, dumb-init)
COPY --from=base /etc/passwd /etc/passwd
COPY --from=base /etc/group /etc/group
COPY --from=base /etc/localtime /etc/localtime
COPY --from=base /etc/timezone /etc/timezone
COPY --from=base /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=base /etc/ssl/certs/ /etc/ssl/certs/

# Writable cache directory for Next.js
COPY --from=prod-prep /tmp/.next /tmp/.next

COPY --chown=${APP_UID}:${APP_GID} --from=builder ${APP_DIR}/public ./public
COPY --chown=${APP_UID}:${APP_GID} --from=builder ${APP_DIR}/.next/standalone ./
COPY --chown=${APP_UID}:${APP_GID} --from=builder ${APP_DIR}/.next/static ./.next/static

# Deploy Service Worker — same image, different CMD in ECS task definition:
#   Web:    CMD ["node", "server.js"]          (default below)
#   Worker: CMD ["node", "dist/worker.js"]     (ECS task def override)
COPY --chown=${APP_UID}:${APP_GID} --from=builder ${APP_DIR}/dist/worker.js ./dist/worker.js
COPY --chown=${APP_UID}:${APP_GID} --from=builder ${APP_DIR}/dist/worker.js.map ./dist/worker.js.map

EXPOSE ${PORT}

USER ${APP_UID}

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:' + process.env.PORT + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
