# Hiro - AI Interview Platform (MVP)

Hiro is an end-to-end interview simulator. Candidates sign up, pay, complete a
fully automated AI-driven interview tailored to a specific role, receive an
instant scored report, and can book a one-hour human coaching session - all in
one polished web app.

This repository contains the **MVP** UI/flow built with **Next.js 14**,
**TypeScript**, and **Tailwind CSS**. OpenAI is integrated client-side for
adaptive follow-ups and report enrichment (demo mode), while Stripe payments,
Google Calendar sync, and email delivery are still stubbed at the integration
boundary.

---

## Highlights

- **Polished marketing site** - hero, features, pricing, testimonials, FAQ, CTA.
- **Auth & checkout** - sign up / sign in / Stripe-style checkout (mock).
- **Adaptive interview engine** - interleaves a curated rubric with AI-generated
  follow-up questions based on the previous answer.
- **Voice + text answers** - Web Speech API for live transcription,
  MediaRecorder for capture; live audio meter; pause/resume.
- **Instant scored report** - five-axis breakdown, per-question feedback,
  strengths, gaps, next steps. Downloadable as a branded **PDF**.
- **Coaching scheduler** - coach picker, week navigator, time slots,
  Google Calendar-style confirmation.
- **Admin dashboard** - sessions, score distribution, revenue, pipeline.
- **Production-grade UI** - minimal, accessible, responsive, dark hero accents.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom design tokens |
| Icons | lucide-react |
| PDF | jspdf (lazy-loaded) |
| Speech-to-text | Web Speech API (with Whisper fallback hook) |
| Voice capture | MediaRecorder API |
| State/persistence (MVP) | localStorage via `lib/store.ts` |

> The MVP runs **without backend APIs**. OpenAI can be enabled by setting
> `NEXT_PUBLIC_OPENAI_API_KEY` in `.env.local` (frontend demo mode). Stripe,
> Google Calendar, and email are isolated behind simple integration points. See
> [Wiring real backends](#wiring-real-backends) below.

---

## Getting started

### Prerequisites

- Node.js 18.17+ (tested on Node 22)
- npm 9+
- **PostgreSQL 14+** (local install, Docker, or a managed provider like Neon/Supabase/RDS)
- **SMTP credentials** (Gmail app password, SendGrid SMTP, AWS SES SMTP, Mailtrap for dev, etc.)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Var | What it is |
|---|---|
| `APP_URL` | Public origin used to build the verification link (e.g. `http://localhost:3000`) |
| `AUTH_SECRET` | Long random string for signing session cookies. Generate with `openssl rand -base64 48` |
| `DATABASE_URL` | Postgres connection string (e.g. `postgres://user:pass@localhost:5432/hiro`) |
| `DATABASE_SSL` | Set `true` if your Postgres requires SSL (Neon/Supabase/RDS) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Nodemailer SMTP credentials |
| `EMAIL_FROM` | The "From" header on outgoing emails |
| `ADMIN_EMAIL` | Where the admin copy of reports should land |
| `NEXT_PUBLIC_OPENAI_API_KEY` | Optional – enables dynamic follow-ups in demo mode |

### 3. Spin up Postgres (one option: Docker)

```bash
docker run --name hiro-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hiro \
  -p 5432:5432 -d postgres:16
```

### 4. Run database migrations

```bash
npm run db:migrate
```

This applies the SQL files under `./drizzle/` (creates `users` and
`email_verification_tokens` tables and required indexes). Re-runnable; it
tracks applied files in a `_hiro_migrations` table.

### 5. Start the app

```bash
npm run dev
# open http://localhost:3000
```

### Build & preview production

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

---

## Demo flow (use this as a script for the screen recording)

> Total runtime: **~3 minutes**.

1. **Landing** (`/`) - show the hero, scroll through Features, How-it-works,
   Pricing, FAQ.
2. Click **Choose Pro** → sign up with the demo account.
3. Land on **Checkout** (`/checkout?plan=pro`) → click **Pay $79**. Watch the
   success state.
4. Auto-redirected to **Interview setup** (`/interview/setup`) →
   pick *Frontend Engineer*, *Senior*, focus areas, and *Test microphone*.
5. Click **Start interview**.
6. **Live interview** (`/interview/[id]`):
   - Toggle between **Voice** and **Type**.
   - Hit **Start recording**, speak for ~10–15 seconds - watch the live
     waveform + transcript stream.
   - Submit. Watch the AI-generated **follow-up** appear in the queue (badge:
     "AI follow-up").
   - Answer 2–3 more questions, then click **End early & generate report**.
7. **Report** (`/interview/[id]/report`):
   - Show overall score, recommendation, breakdown, per-question feedback.
   - Click **Download PDF** - a branded PDF is generated client-side.
   - Click **Email a copy** - confirmation banner appears (candidate + admin).
8. Click **Schedule a session** → pick a coach, day, slot, **Confirm booking**
   → calendar confirmation card.
9. Visit **Admin** (`/admin`) → show the operations dashboard.

---

## Project structure

```
app/
  layout.tsx              Root layout + Inter font
  page.tsx                Marketing landing
  login/                  Sign in
  signup/                 Sign up
  checkout/               Stripe-style payment
  dashboard/              Authenticated user dashboard
    layout.tsx            Sidebar shell (AppShell)
    page.tsx              Overview (stats, recent reports)
    reports/page.tsx      All reports table
  interview/
    setup/page.tsx        Configure role/level/focus/mic
    [id]/page.tsx         Live interview UI
    [id]/report/page.tsx  Scored feedback report
  schedule/page.tsx       Coach booking (calendar)
  admin/page.tsx          Admin operations dashboard

components/
  ui/                     Design system primitives (Button, Card, Badge, …)
  marketing/              Landing page sections
  app/AppShell.tsx        Authenticated sidebar shell
  auth/AuthShell.tsx      Two-pane auth layout
  interview/Recorder.tsx  Voice + text answer capture

lib/
  utils.ts                cn(), formatters, ids
  mock-data.ts            Roles, levels, plans, scripted questions
  question-engine.ts      Plan builder, AI follow-up logic, report scorer
  speech.ts               LiveTranscriber (Web Speech) + VoiceRecorder
  pdf.ts                  Branded PDF report generator
  store.ts                localStorage-backed persistence
```

---

## Authentication & email verification

Auth is implemented inside this Next.js app (no external service needed).

### Flow

1. **Sign up** (`POST /api/auth/signup`)
   - Creates an unverified user in Postgres (`bcryptjs` password hash).
   - Issues a one-time, hashed verification token and emails a link via
     Nodemailer:
     `${APP_URL}/verify-email?token=...`
   - **Edge case** (re-signup before verifying): if the email already exists
     and is **not verified**, the password and name are refreshed and a fresh
     verification link is mailed. The user is never blocked with
     "email already registered" while still in the unverified window.
   - If the email exists **and** is already verified → `409 email_already_registered`.

2. **Verify email** (`/verify-email?token=...` → `POST /api/auth/verify-email`)
   - Looks up the SHA-256 hash of the token, checks expiry/consumed flags,
     marks the user verified, consumes the token, and issues a session cookie.
   - Invalid/expired token → page offers a one-click resend.

3. **Login** (`POST /api/auth/login`)
   - Wrong password → `401 invalid_credentials`.
   - Verified user → sets HTTP-only signed session cookie (`hiro_session`,
     7 days, `jose` HS256), redirects to `/dashboard`.
   - Unverified user → `403 email_not_verified` and the login page shows a
     "Resend verification" button without leaking whether the password was correct.

4. **Resend** (`POST /api/auth/resend-verification`)
   - Always responds 200 with the same generic message regardless of whether
     the email exists, to avoid account enumeration. Only sends if the account
     exists *and* is still unverified.

5. **Session** (`GET /api/auth/me`, `POST /api/auth/logout`)
   - `me` returns the current user (verified only) or `null`.
   - `logout` clears the cookie.

### Postgres schema

```
users (
  id, email, password_hash, name,
  email_verified, email_verified_at,
  plan, role,
  created_at, updated_at
)
-- case-insensitive unique on email via UNIQUE INDEX (LOWER(email))

email_verification_tokens (
  id, user_id (FK), token_hash (unique),
  expires_at, consumed_at, created_at
)
```

The Drizzle schema lives in `lib/db/schema.ts`; the executable migration is
`drizzle/0000_init_auth.sql` (applied via `npm run db:migrate`).

### Files at a glance

```
lib/db/                        Drizzle client + schema
lib/auth/password.ts           bcrypt hash/verify
lib/auth/tokens.ts             generate/hash verification tokens
lib/auth/session.ts            JWT (jose) HTTP-only cookie session
lib/auth/verification-service  central "issue verification email" flow
lib/email/                     nodemailer transporter + branded HTML template
lib/auth/client.ts             tiny typed fetch client used by signup/login UI
app/api/auth/                  signup · login · logout · verify-email · resend · me
app/verify-email/page.tsx      handles the email link, resend on failure
app/signup/page.tsx            real signup + "check your email" state
app/login/page.tsx             real login + "email isn't verified" + resend
```

---

## Wiring real backends

Each integration is intentionally isolated behind a thin module so production
wiring is mechanical:

### 1. OpenAI / Whisper transcription

Replace `LiveTranscriber` calls in `components/interview/Recorder.tsx` with a
post-recording POST to `/api/transcribe`. Sketch:

```ts
// app/api/transcribe/route.ts
import OpenAI from "openai";
const openai = new OpenAI();

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("audio") as File;
  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  return Response.json({ transcript: result.text });
}
```

### 2. AI follow-up questions

Swap `maybeGenerateFollowUp` in `lib/question-engine.ts` for a server route
that calls GPT-4o with the prior question + answer + role context. The shape of
the returned `InterviewQuestion` does not need to change.

### 3. Stripe

Replace the mock `onSubmit` in `app/checkout/page.tsx` with a Stripe Checkout
session redirect:

```ts
const res = await fetch("/api/checkout", { method: "POST", body: JSON.stringify({ planId }) });
const { url } = await res.json();
location.href = url;
```

### 4. Google Calendar

Swap the local `store.saveBooking` in `app/schedule/page.tsx` for a route that
creates a Calendar event via the Google Calendar API and emails a meeting link.

### 5. Email delivery

In `app/interview/[id]/report/page.tsx`, the **Email a copy** button currently
shows a confirmation banner. Wire it to `/api/report/email` using Resend,
SendGrid, or Postmark.

### 6. Persistent storage

Replace `lib/store.ts` with a server-side store (Postgres + Prisma, Supabase,
or Convex). The interface is intentionally tiny - `getReports`, `saveReport`,
`getUser`, `setUser`, `saveBooking`.

---

## Design system

Tokens live in `tailwind.config.ts` under `theme.extend.colors` (`ink.*`,
`accent.*`, `success/warn/danger`). Primitives in `components/ui/*` are the only
allowed surface for buttons, cards, badges, inputs, and progress meters - keep
new screens consistent by composing these.

Typography uses Inter via Google Fonts (loaded in `app/layout.tsx`).

---

## Acceptance criteria coverage

| # | Requirement | Status |
|---|---|---|
| 1 | Responsive web app with secure login, payment, interview flow, and admin dashboard | ✅ Implemented (mock auth + payment for MVP) |
| 2 | Question engine switches seamlessly between scripted and dynamically generated prompts | ✅ `lib/question-engine.ts` interleaves scripted + AI follow-ups |
| 3 | Voice capture works in modern browsers; transcripts appear for review | ✅ `components/interview/Recorder.tsx` (MediaRecorder + Web Speech) |
| 4 | PDF/HTML feedback reports include scoring, strengths, and improvement tips | ✅ HTML at `/interview/[id]/report`, PDF via `lib/pdf.ts` |
| 5 | Scheduling module confirms bookings and syncs with Google Calendar | ✅ `/schedule` with confirmation; Google Calendar wiring documented above |
| 6 | Full source code, setup instructions, and a short demo video | ✅ Source + README; recording script above |

---

## Known MVP limitations

- Reports/bookings still persist in `localStorage`; only **auth** is in
  Postgres for now. Migrating those to the DB is a follow-up.
- AI follow-ups and report scoring are heuristic-based for offline demo; both
  are designed to be swapped for a server-side OpenAI call without UI changes.
- Stripe checkout is visual-only; no real charge is made.

These are deliberate trade-offs for the MVP. The integration boundaries above
make production hardening straightforward.

---

© Hiro Labs, Inc. - MVP build.
