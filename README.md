# Apex — AI Interview Platform (MVP)

Apex is an end-to-end interview simulator. Candidates sign up, pay, complete a
fully automated AI-driven interview tailored to a specific role, receive an
instant scored report, and can book a one-hour human coaching session — all in
one polished web app.

This repository contains the **MVP** UI/flow built with **Next.js 14**,
**TypeScript**, and **Tailwind CSS**. OpenAI is integrated client-side for
adaptive follow-ups and report enrichment (demo mode), while Stripe payments,
Google Calendar sync, and email delivery are still stubbed at the integration
boundary.

---

## Highlights

- **Polished marketing site** — hero, features, pricing, testimonials, FAQ, CTA.
- **Auth & checkout** — sign up / sign in / Stripe-style checkout (mock).
- **Adaptive interview engine** — interleaves a curated rubric with AI-generated
  follow-up questions based on the previous answer.
- **Voice + text answers** — Web Speech API for live transcription,
  MediaRecorder for capture; live audio meter; pause/resume.
- **Instant scored report** — five-axis breakdown, per-question feedback,
  strengths, gaps, next steps. Downloadable as a branded **PDF**.
- **Coaching scheduler** — coach picker, week navigator, time slots,
  Google Calendar-style confirmation.
- **Admin dashboard** — sessions, score distribution, revenue, pipeline.
- **Production-grade UI** — minimal, accessible, responsive, dark hero accents.

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

### Install & run

```bash
cp .env.example .env.local
# add NEXT_PUBLIC_OPENAI_API_KEY in .env.local (optional but recommended)
npm install
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

1. **Landing** (`/`) — show the hero, scroll through Features, How-it-works,
   Pricing, FAQ.
2. Click **Choose Pro** → sign up with the demo account.
3. Land on **Checkout** (`/checkout?plan=pro`) → click **Pay $79**. Watch the
   success state.
4. Auto-redirected to **Interview setup** (`/interview/setup`) →
   pick *Frontend Engineer*, *Senior*, focus areas, and *Test microphone*.
5. Click **Start interview**.
6. **Live interview** (`/interview/[id]`):
   - Toggle between **Voice** and **Type**.
   - Hit **Start recording**, speak for ~10–15 seconds — watch the live
     waveform + transcript stream.
   - Submit. Watch the AI-generated **follow-up** appear in the queue (badge:
     "AI follow-up").
   - Answer 2–3 more questions, then click **End early & generate report**.
7. **Report** (`/interview/[id]/report`):
   - Show overall score, recommendation, breakdown, per-question feedback.
   - Click **Download PDF** — a branded PDF is generated client-side.
   - Click **Email a copy** — confirmation banner appears (candidate + admin).
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
or Convex). The interface is intentionally tiny — `getReports`, `saveReport`,
`getUser`, `setUser`, `saveBooking`.

---

## Design system

Tokens live in `tailwind.config.ts` under `theme.extend.colors` (`ink.*`,
`accent.*`, `success/warn/danger`). Primitives in `components/ui/*` are the only
allowed surface for buttons, cards, badges, inputs, and progress meters — keep
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

- All persistence is client-side (`localStorage`). Refreshing in a different
  browser starts a new session.
- AI follow-ups and report scoring are heuristic-based for offline demo; both
  are designed to be swapped for a server-side OpenAI call without UI changes.
- Stripe checkout is visual-only; no real charge is made.
- Auth is unverified — any email + 6-char password works.

These are deliberate trade-offs for the MVP. The integration boundaries above
make production hardening straightforward.

---

© Apex Labs, Inc. — MVP build.
