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

EMAIL_HOST=       # SMTP host (e.g. smtp.gmail.com)
EMAIL_PORT=       # 587
EMAIL_SECURE=     # false for TLS, true for SSL
EMAIL_USER=       # Leave empty in dev — OTPs print to console instead
EMAIL_PASS=       # Gmail: use an App Password, not your account password
EMAIL_FROM=       # e.g. "UpdateCentral <you@gmail.com>"
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
- **viewer** — read-only access to `/updates` and `/whats-new`
- **admin** — can create/edit/publish updates at `/editor` + manage users/products at `/admin`

Access is also gated by `isWhitelisted: true` on the User document — a user with a valid role but `isWhitelisted: false` cannot sign in.

### Route protection

`src/middleware.ts` uses `next-auth/middleware` to protect `/updates`, `/whats-new`, `/editor`, and `/admin`. Role checks (e.g. redirecting non-editors from `/editor`) are done inside each page's server component.

### Data models (`src/models/`)

- **User** — `email`, `name`, `role`, `isWhitelisted`. `hashedPassword` is optional (legacy, unused).
- **Product** — `name`, `slug`, `description`, `color`. Slug is auto-generated from name.
- **Update** — `title`, `summary`, `content`, `productId`, `date`, `highlights[]`, `isPublished`, `createdBy`.
- **OTP** — `email`, `code` (bcrypt hash), `expiresAt`, `used`. MongoDB TTL index auto-deletes expired records.
- **UserSeenUpdate** — tracks which updates each user has seen (used by the "What's New" badge).

### Key lib files

- `src/lib/auth.ts` — NextAuth config and OTP verification logic
- `src/lib/mongodb.ts` — singleton Mongoose connection with global cache (required for Next.js hot reload)
- `src/lib/email.ts` — nodemailer transporter + `sendOTPEmail()`

### Admin API

Admin-only routes live under `src/app/api/admin/users/` — GET all users, POST create user, PATCH update role/whitelist, DELETE user. All check `session.user.role === 'admin'`.

All other API routes (`/api/products`, `/api/updates`) require `admin` role for write operations.
