# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10.x** (pinned via `packageManager` and `pnpm-workspace.yaml`). Don't use `npm`/`yarn`.

```bash
pnpm dev              # Next.js dev server (auto-selects port if 3000 is taken)
pnpm build            # Production build (next build; worker is built separately)
pnpm build:worker     # esbuild bundle of src/worker.ts → dist/worker.js
pnpm lint             # next lint (ESLint 9)
pnpm test             # vitest run (suite lives in test/api/)
pnpm test:watch       # vitest watch mode

# Run a single test file or a single named test
pnpm test test/api/updates.test.ts
pnpm test -- -t "publishes scheduled updates"

# DB / user scripts (tsx, read from .env.local)
pnpm seed                # Seed products + updates + test users
pnpm seed-domains        # Seed domains only
pnpm create-user         # --email= --name= [--role=public|viewer|admin]
pnpm set-role            # --email= --role=
pnpm migrate-roles       # One-time: editor → admin
pnpm migrate-db          # Generic DB migration entrypoint
```

`postinstall` runs `scripts/apply-patches.mjs` (currently a `@tiptap/pm` patch declared in pnpm `patchedDependencies`).

## Environment

`.env.local` for dev. Only one var is strictly required:

- `MONGODB_URI` — Mongo connection string
- `DEV_USER_EMAIL` (dev only) — simulates a logged-in user when the gateway isn't fronting the app. Optional: `DEV_USER_ID`, `DEV_USER_NAME`.
- `EMAIL_USER` + nodemailer config (optional) — if unset, email send paths effectively no-op.

There is **no NextAuth** in this codebase. `NEXTAUTH_URL` / `NEXTAUTH_SECRET` are not used; ignore older references.

## Architecture

**Stack:** Next.js 15 (App Router, standalone output), React 19, MongoDB via Mongoose 9, Tailwind v4, Radix UI primitives, Tiptap 3, Zod, TanStack Query, Vitest, pino.

### Auth model — gateway headers (not NextAuth)

Authentication is delegated to an **upstream gateway** (ALB / OIDC sidecar / proxy). The gateway injects these headers on every request:

- `x-auth-user-id` (required)
- `x-auth-user-email` (required)
- `x-auth-user-name` (optional)
- `x-auth-user-image` (optional)

Two pieces consume them:

1. [src/middleware.ts](src/middleware.ts) — gates `/updates`, `/editor`, `/admin`, `/saved`. Returns `401` if the required headers are missing. **It does not redirect to a login page** — the gateway owns auth UX.
2. [src/lib/auth.ts](src/lib/auth.ts) `getSession(headers)` — reads the headers, upserts the `User` doc (matched by email, defaults to `role: 'public'`), returns an `AuthSession` for server components / route handlers.

In non-production, if `DEV_USER_EMAIL` is set, the gateway check is bypassed — useful for `pnpm dev` without a proxy in front.

### Roles

Three roles: `public`, `viewer`, `admin`.

- `public` — default for any newly-seen email
- `viewer` — read-only access to gated feeds
- `admin` — full editor + admin dashboard access

Role checks live inside server components and route handlers (e.g. `/editor` redirects non-admins; admin API routes hard-check `session.user.role === 'admin'`). Gating is entirely role-based — there is no separate whitelist field.

### Data models (`src/models/`)

Mongoose models, all using the shared `connectDB()` singleton in [src/lib/mongodb.ts](src/lib/mongodb.ts).

- **User** — `email`, `name`, `role`, `image`. Matched by email so external auth providers can swap without breaking historical `createdBy` references.
- **Update** — main content type. Both singular (`productId`/`domainId`) and plural (`productIds[]`/`domainIds[]`) fields coexist; read paths merge and dedupe. Supports scheduling via `scheduledAt`+`isPublished`.
- **BlogPost** — Tiptap HTML content, categories, `status` (`draft`|`scheduled`|`published`), `isFeatured` + `featuredUntil`. **Only one post can be featured at a time** — the PATCH route enforces this by clearing other posts' `isFeatured`.
- **Comment / BlogComment** — threaded comments; `@mentions` create **Notification** records.
- **UserSeenUpdate / SavedUpdate** — read tracking + bookmarks.
- **Product / Domain / Tag** — taxonomy. Products auto-slug from name and have an `order` field; there's a dedicated reorder endpoint.
- **PageSetting** — admin-configurable per-page settings (with its own reorder endpoint).
- **ExternalArticle** — curated external links for the blog sidebar.
- **ActivityLog** — written by `withLogging`/`activityLog` lib helpers wrapping mutating routes.

### Key lib files

- [src/lib/auth.ts](src/lib/auth.ts) — gateway-header session
- [src/lib/mongodb.ts](src/lib/mongodb.ts) — singleton Mongoose connection with global cache (required for Next.js hot reload)
- [src/lib/with-logging.ts](src/lib/with-logging.ts) + [src/lib/activityLog.ts](src/lib/activityLog.ts) — wrap API handlers to record `ActivityLog` entries
- [src/lib/handle-api-error.ts](src/lib/handle-api-error.ts) — standard error response shape for route handlers
- [src/lib/sanitizeMarkdown.ts](src/lib/sanitizeMarkdown.ts) — sanitises update/blog content before render
- [src/lib/logger.ts](src/lib/logger.ts) — pino logger (with `pino-pretty` in dev)
- [src/lib/use-session.ts](src/lib/use-session.ts) — client-side session hook

### File uploads → GridFS

`POST /api/uploads` writes to MongoDB **GridFS** (bucket name `uploads`); files are served back via `GET /api/uploads/[id]`. The endpoint returns `{ url: '/api/uploads/<objectId>' }`. Accepts images and videos. No filesystem writes — works with read-only container roots.

### `/editor` server-component side effects

The `/editor` page (server component) performs two writes on every load:

1. Auto-publishes scheduled `Update`s where `scheduledAt <= now`.
2. Auto-unfeatures `BlogPost`s where `featuredUntil <= now`.

Be mindful that loading `/editor` mutates DB state — don't add expensive unconditional logic there.

### Worker process

[src/worker.ts](src/worker.ts) is currently a heartbeat stub bundled by esbuild into `dist/worker.js`. The production Docker image ships both `server.js` and `dist/worker.js`; the ECS task definition picks which `CMD` to run (web vs worker). Add scheduled jobs here, not as request-time side effects.

### Page structure

| Route | Purpose |
|---|---|
| `/updates`, `/updates/[id]` | Viewer feed + detail (gated) |
| `/blog`, `/blog/[slug]` | Blog listing + detail |
| `/products`, `/products/[slug]` | Product catalogue + per-product updates |
| `/saved` | Bookmarked updates (gated) |
| `/editor`, `/editor/new`, `/editor/[id]` | Admin: create/edit updates |
| `/editor/blog/...`, `/editor/products/[id]` | Admin: blog + product editing |
| `/admin` | Users, domains, tags, page settings |

### Admin API

Everything under `src/app/api/admin/` requires `role === 'admin'`. Other API routes allow reads broadly but require admin for writes.

## Docker / deploy notes

- [Dockerfile](Dockerfile) is multi-stage (deps → builder → prod-prep → prod), producing a standalone Next.js image plus the worker bundle. Build args allow swapping the prod stage to a hardened/distroless image (`--build-arg NODE=...`).
- The `builder` stage does `COPY ./ ./`, so anything not in [.dockerignore](.dockerignore) ends up in the image. `.env.local` and `.env.*.local` are excluded; **`.env` is not**. Prefer runtime env injection (ECS task def / Secrets Manager) over baking secrets into the image.
- `public/` is tracked via a `.gitkeep` so the `COPY /app/public ./public` step in the prod stage doesn't fail when the directory is empty in CI.
- The container health check hits `/api/health` on `$PORT`.

## Tests

Vitest is configured for the API surface only — see [vitest.config.ts](vitest.config.ts) (`include: test/api/**/*.test.ts`). There are no UI/component tests. Test files use the `@/` alias for `src/`. Tests connect to MongoDB via the lib singleton, so point `MONGODB_URI` at a throwaway DB before running.
