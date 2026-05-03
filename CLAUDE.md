# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (auto-selects port if 3000 is taken — check output)
npm run build        # Production build
npm run lint         # ESLint

npm run seed         # Seed DB with test products, updates, and two whitelisted users
npm run create-user  # Create a whitelisted user: --email= --name= [--role=viewer|admin]
npm run whitelist-user  # Toggle whitelist: --email= [--revoke]
npm run migrate-roles  # One-time: migrate all editor users to admin
```

No test suite is configured.

## Environment Variables (`.env.local`)

```
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

```

## Architecture

**Stack:** Next.js 14 (App Router), MongoDB via Mongoose, NextAuth v4, Tailwind CSS, Radix UI primitives.

### Auth flow

Authentication is **OTP-only** — no passwords. Login is two steps:
1. User submits email → `POST /api/auth/otp` generates a 6-digit code, hashes it with bcrypt, stores it in the `OTP` collection (10-min TTL, rate-limited to 1/60s), and emails it.
2. User submits code → NextAuth `credentials` provider verifies against the hashed OTP record and marks it used.

In development, if `EMAIL_USER` is empty, the OTP is logged to the server console instead of sent.

### Roles

Two roles: `viewer`, `admin`.
- **viewer** — read-only access to `/updates` and `/blog`
- **admin** — can create/edit/publish updates at `/editor` + manage users/products at `/admin`

Access is also gated by `isWhitelisted: true` on the User document — a user with a valid role but `isWhitelisted: false` cannot sign in.

### Route protection

`src/middleware.ts` uses `next-auth/middleware` to protect `/updates`, `/editor`, `/admin`, and `/saved`. Role checks (e.g. redirecting non-admins from `/editor`) are done inside each page's server component.

### Data models (`src/models/`)

**Core:**
- **User** — `email`, `name`, `role`, `isWhitelisted`. `hashedPassword` is optional (legacy, unused).
- **OTP** — `email`, `code` (bcrypt hash), `expiresAt`, `used`. MongoDB TTL index auto-deletes expired records.

**Updates:**
- **Update** — `title`, `summary`, `content`, `productId`/`productIds[]`, `domainId`/`domainIds[]`, `tagIds[]`, `date`, `highlights[]`, `progressUpdates`, `nextSteps`, `learningPoints`, `media[]`, `isPublished`, `scheduledAt`, `createdBy`, `updatedBy`. Both the singular and plural product/domain fields coexist; read logic merges and deduplicates them.
- **Comment** — threaded comments on updates; mentions trigger Notification records.
- **UserSeenUpdate** — tracks which updates each user has seen (used by unread badge).
- **SavedUpdate** — bookmarked updates per user.
- **Notification** — `type: 'comment'`, `userId`, `fromUserId`, `commentId`, `updateId`, `read`.

**Products & Domains:**
- **Product** — `name`, `slug`, `description`, `color`, `logoUrl`, `status`, `isHidden`, `order`, `domainId`. Slug is auto-generated from name.
- **Domain** — `name`, `slug`, `description`, `members[]`. Groups products into higher-level areas.
- **Tag** — lightweight labels applied to updates via `tagIds[]`.

**Blog:**
- **BlogPost** — `title`, `slug`, `excerpt`, `content` (HTML from Tiptap), `coverImage`, `category` (`thought` | `learning-journey` | `field-notes` | `deep-dive`), `tags[]`, `authorName`, `publishedAt`, `readTime`, `status` (`draft` | `scheduled` | `published`), `isFeatured`, `featuredUntil`, `likes[]`, `savedBy[]`.
- **BlogComment** — comments on blog posts.
- **ExternalArticle** — curated external links shown in the blog sidebar, grouped by category, with a manual `order` field.

### Key lib files

- `src/lib/auth.ts` — NextAuth config and OTP verification logic
- `src/lib/mongodb.ts` — singleton Mongoose connection with global cache (required for Next.js hot reload)
- `src/lib/email.ts` — nodemailer transporter + `sendOTPEmail()`
- `src/lib/sanitizeMarkdown.ts` — used to sanitize update content before display

### File uploads

`POST /api/uploads` stores files in MongoDB **GridFS** (`uploads` bucket). Files are served back via `GET /api/uploads/[id]`. Accepts images and videos up to 50 MB. Returns `{ url: '/api/uploads/<objectId>' }`.

### Editor dashboard side effects

`/editor` (server component) runs two write operations on every load:
1. Auto-publishes scheduled Updates where `scheduledAt <= now`.
2. Auto-unfeatures BlogPosts where `featuredUntil <= now`.

### Admin API

Admin-only routes live under `src/app/api/admin/` — users, tags, and domains. All check `session.user.role === 'admin'`.

All other API routes (`/api/products`, `/api/updates`, `/api/blog`) require `admin` role for write operations.

### Blog featured post

Only one post can be `isFeatured: true` at a time. The PATCH route for blog posts enforces this by clearing `isFeatured` on all other posts when setting a new one. `featuredUntil` stores a UTC Date; the editor form displays and accepts it in Singapore time (UTC+8) using offset arithmetic — no timezone library needed.

### Page structure

| Route | Purpose |
|---|---|
| `/updates` | Viewer feed of published updates |
| `/updates/[id]` | Single update detail with comments |
| `/blog` | Blog listing with featured post + category filters |
| `/blog/[slug]` | Blog post detail with comments and likes |
| `/products` | Product catalogue |
| `/products/[slug]` | Product detail with its updates |
| `/saved` | Bookmarked updates for the current user |
| `/editor` | Admin dashboard: Updates / Products / Blog tabs |
| `/editor/new`, `/editor/[id]` | Create / edit an update |
| `/editor/blog/new`, `/editor/blog/[id]` | Create / edit a blog post |
| `/editor/products/[id]` | Edit a product |
| `/admin` | User, domain, and tag management |
