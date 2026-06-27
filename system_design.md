# Reachly — System Design Document

> AI-powered SaaS platform that automates lead generation and organic content
> marketing for **B2B** and **B2C** products. A user describes their product once
> during onboarding, then launches campaigns that scrape leads, generate channel-native
> posts, schedule them on a calendar, and surface insights through an AI strategist chat.

---

## 1. High-Level Overview

Reachly is a single Next.js application (App Router) backed by a serverless Postgres
database. There is no separate backend service — all server logic lives in Next.js
**Route Handlers** (`app/api/**`) and **Server Components**. Long-running work (lead
scraping, multi-post AI generation) runs inline inside POST handlers and records its
progress in an `agent_runs` table.

Two product modes are derived entirely from one field — `products.audience` (`"b2b"`
or `"b2c"`) — which drives navigation, dashboards, and which generation pipelines are
available.

```
                         ┌──────────────────────────────────────────────┐
                         │                Browser (React 19)             │
                         │   Landing · Login · Onboarding · Dashboards    │
                         └───────────────┬───────────────┬──────────────┘
                                         │ HTML/RSC      │ fetch() JSON
                         ┌───────────────▼───────────────▼──────────────┐
                         │              Next.js 16 (App Router)          │
                         │  Server Components │ Route Handlers (/api/**)  │
                         │  Better Auth handler (/api/auth/[...all])      │
                         └───┬──────────┬──────────┬──────────┬──────────┘
                             │          │          │          │
                   ┌─────────▼──┐  ┌────▼─────┐ ┌──▼───────┐ ┌▼───────────┐
                   │ Neon       │  │ OpenRouter│ │ Apify    │ │ Unsplash   │
                   │ Postgres   │  │ (gpt-4o-  │ │ (lead    │ │ (static    │
                   │ (Drizzle)  │  │  mini)    │ │  actor)  │ │  photo pool)│
                   └────────────┘  └──────────┘ └──────────┘ └────────────┘
```

---

## 2. Technology Stack

| Layer            | Choice                                                        |
|------------------|---------------------------------------------------------------|
| Framework        | Next.js 16.2.9 (App Router, Turbopack, React 19.2)            |
| Language         | TypeScript 5                                                  |
| Database         | Neon serverless Postgres (HTTP driver)                        |
| ORM              | Drizzle ORM 0.45 + drizzle-kit                                |
| Auth             | Better Auth 1.6 (email/password, Drizzle adapter)            |
| AI               | Vercel AI SDK 7 + `@ai-sdk/openai` pointed at **OpenRouter** (`openai/gpt-4o-mini`) |
| Lead scraping    | Apify (`apify-client`) actor `khadinakbar/universal-lead-finder` |
| Styling          | Inline styles + CSS custom-property design tokens (`globals.css`) + Tailwind v4 (PostCSS) |
| Notifications    | `sonner` toasts                                               |
| Icons            | `lucide-react`                                                |
| Validation       | `zod` (available)                                             |
| Hosting          | Vercel                                                        |

---

## 3. Repository Structure

```
app/
  layout.tsx                 Root layout: fonts (Geist), <Toaster>, global CSS
  route.ts                   GET / → serves the static landing page (index (1).html)
  globals.css                Design tokens, light/dark themes, badges
  (auth)/login/              Login + sign-up form (client)
  (onboarding)/onboarding/   Multi-step product setup wizard (client)
  (app)/                     Authenticated shell
    layout.tsx               Auth gate + sidebar; redirects to /onboarding if no product
    dashboard/
      page.tsx               Redirects to /dashboard/b2b or /b2c by audience
      b2b/  (Overview, campaigns, vault, linkedin, chat)
      b2c/  (Overview, campaigns, vault, schedule, chat)
      settings/
  api/
    auth/[...all]/           Better Auth catch-all handler
    onboarding/              Create product (onboardingDone = true)
    product/  classify/      Product read + AI GTM classification
    campaigns/b2b/generate/  Lead-gen OR LinkedIn post generation
    campaigns/b2c/generate/  Multi-platform social post generation + mock images
    drafts/  drafts/[id]/    List / update drafts (status, schedule slot)
    leads/[id]/              Update a lead
    chat/                    AI strategist chat (context-aware cards)
    agents/**                Granular agent run/content endpoints
components/
  SidebarNav, SignOutButton, DarkModeToggle
  posts/  (InstagramCard, FacebookCard, RedditCard, LinkedInCard)
  chat/AiChat.tsx
lib/
  db/        Drizzle client (lazy Neon) + schema.ts
  auth.ts    Better Auth config        auth-client.ts  client SDK
  ai/        classifyProduct() + generateContent()
  apify/     runLeadSearch()
  utils.ts
public/      Optimized team avatars + SVGs
```

---

## 4. Data Model (`lib/db/schema.ts`)

All IDs are text. App tables use `crypto.randomUUID()`; auth tables use Better Auth IDs.

### Auth tables (Better Auth managed)
- **users** — id, name, email (unique), emailVerified, image, timestamps.
- **sessions** — token (unique), expiresAt, ipAddress, userAgent, userId → users.
- **accounts** — provider credentials + hashed `password`, userId → users.
- **verifications** — identifier/value/expiresAt (email + token flows).

### Application tables
- **products** — the central entity, owned by a user.
  - Shared: name, description, type (`saas|paas`), `audience` (`b2b|b2c`), scope[], budget, channels[], companyStage.
  - B2B targeting: targetTitles[], targetIndustry, targetSizes[], keywords[], painPoint, differentiator.
  - B2C campaign: targetCustomer, niche, offering, tone, appType, goals[], intensity.
  - Meta: `classification` (jsonb, AI output), `onboardingDone` (bool gate).
- **campaigns** — productId → products; name; platforms[]; `type`
  (`b2c-content | b2b-leads | b2b-linkedin`); status (`active|paused|completed`);
  `settings` jsonb (per-campaign strategy/targeting).
- **leads** — productId, optional campaignId; name/title/company/email/linkedinUrl;
  source (`apollo`); status (`new|contacted|replied|bounced`); `raw` jsonb;
  `kpiData` jsonb (emailOpened, replied, meetings, emailsSent).
- **drafts** — generated content. productId, optional campaignId/leadId;
  `channel` (`cold-email|linkedin|instagram|reddit|facebook`); platform; subject; body;
  status (`draft|approved|scheduled|sent|failed`); scheduledAt + `scheduledDay`/`scheduledTime`
  (calendar slot); postedAt; `engagements` jsonb; `imagePrompt`; `mediaUrl`.
- **agent_runs** — audit/progress for async work. productId, campaignId, channel, type,
  status (`queued|running|succeeded|failed`), `output` jsonb.
- **chat_messages** — productId; role (`user|assistant`); content; `metadata` jsonb
  (card payloads for rich rendering).

**Relationships (ownership cascade):** `users → products → {campaigns, leads, drafts,
agent_runs, chat_messages}`. Campaign/lead references use `set null` on delete so content
survives campaign deletion.

---

## 5. Authentication & Authorization

- **Better Auth** with the Drizzle adapter (`lib/auth.ts`), email + password, email
  verification **disabled** (hackathon-friendly). The catch-all handler at
  `app/api/auth/[...all]/route.ts` exposes sign-up / sign-in / sign-out / session.
- **Trusted origins** come from `NEXT_PUBLIC_APP_URL` — this **must equal the deployed
  domain** or cookies are rejected.
- **Authorization is ownership-based, enforced server-side.** Every protected handler and
  server component calls `auth.api.getSession({ headers })`, then scopes all queries by
  `products.ownerId === session.user.id`. There are no roles; a user only ever sees rows
  tied to their own product. `app/(app)/layout.tsx` is the gate: no session → `/login`;
  session but no completed product → `/onboarding`.

---

## 6. Core Request Flows

### 6.1 Onboarding
1. Authenticated user fills the multi-step wizard (`/onboarding`).
2. `POST /api/onboarding` inserts a **products** row with `onboardingDone = true` and
   fires `/api/classify` in the background (non-blocking).
3. `classifyProduct()` asks the model for a GTM tier/persona/channel JSON, stored in
   `products.classification`.
4. Next dashboard visit: `app/(app)/layout.tsx` finds the product and renders the
   correct (B2B/B2C) sidebar; `/dashboard` redirects by `audience`.

### 6.2 B2B — Lead Generation (`type: "b2b-leads"`)
`POST /api/campaigns/b2b/generate` → insert campaign + `agent_runs(running)` →
`runLeadSearch()` builds a query from titles/industry/keywords and **calls the Apify
actor** → maps dataset items (filtering for emails) into **leads** rows → marks the run
`succeeded` with `leadsFound`. Leads appear in the B2B **Vault**.

### 6.3 B2B — LinkedIn Content (`type: "b2b-linkedin"`)
Same envelope, but generates N LinkedIn posts **in parallel** via
`generateContent({ channel: "linkedin" })` (`Promise.allSettled`), inserting fulfilled
results as **drafts**.

### 6.4 B2C — Social Content (`type: "b2c-content"`)
`POST /api/campaigns/b2c/generate` → for each selected platform × postCount, generate a
caption in parallel → each draft is bound to a **mock image**: `getMockImageForProduct()`
keyword-matches the product against a 15-photo Unsplash pool and assigns a `mediaUrl`.
Drafts render in platform-accurate preview cards (`components/posts/*`).

### 6.5 Scheduling (B2C)
The **Schedule** page (`ScheduleCalendar.tsx`) is a 7-day × 7-time-slot grid. An
unscheduled queue feeds a manual "pick a slot" flow and a one-click **Auto-Scheduler**
(posts/week × target days × time). Each placement `PATCH /api/drafts/[id]` updates
`status` + `scheduledDay`/`scheduledTime`. (Interaction is click-to-place; "drag" is copy.)

### 6.6 AI Strategist Chat
`POST /api/chat` gathers product + last 10 campaigns + last 20 drafts + (B2B) lead stats
**in parallel**, packs them into a system prompt, and asks the model to reply as a **JSON
array of typed cards** (`analytics | campaign_summary | post_preview | text`). Both the
user message and assistant cards are persisted to **chat_messages** for history.

---

## 7. External Integrations

| Service     | Used for | Notes |
|-------------|----------|-------|
| **Neon Postgres** | All persistence | HTTP driver; client is lazily instantiated so a missing `DATABASE_URL` can't crash the build. |
| **OpenRouter**    | All text generation (classification, posts, chat) | OpenAI-compatible endpoint, model `openai/gpt-4o-mini`; responses are JSON-parsed with a plain-text fallback. |
| **Apify**         | Real B2B lead scraping | Actor `khadinakbar/universal-lead-finder`; reads the run's default dataset. |
| **Unsplash**      | B2C post imagery | **Static mock pool** (no API call) keyword-matched to the product. Intended swap point for real image generation (DALL·E / Stability). |

---

## 8. Frontend Architecture

- **Server Components by default** for dashboards/data fetching; **Client Components**
  (`"use client"`, 19 of them) for interactivity (forms, calendar, chat, toggles).
- **Styling** is primarily inline-style objects driven by CSS custom properties
  (`--bg`, `--fg`, `--accent`, …) defined in `globals.css`, giving light/dark theming via
  a `DarkModeToggle`. Tailwind v4 is wired through PostCSS for utility classes.
- **Navigation** (`SidebarNav`) renders a different link set for B2B vs B2C and is wrapped
  in `<Suspense>` because it reads `usePathname()`.
- **Post previews** mimic each network's chrome (Instagram/Facebook/Reddit/LinkedIn cards).

---

## 9. Performance Characteristics

Implemented optimizations:
- **Team avatars** recompressed to 320px (≈2.2 MB → ≈150 KB total) at identical filenames
  and aspect ratios, preserving the landing layout.
- **Landing page** (`app/route.ts`) is read **once at module load** and served with
  `Cache-Control: public, max-age=3600, must-revalidate` instead of a per-request disk read.
- **next.config** enables Unsplash image optimization and strips non-error `console.*` from
  production bundles.
- **Post-card `<img>`** use `loading="lazy"` + `decoding="async"`.
- **Generation & chat** fan out work with `Promise.allSettled` / `Promise.all`.

Latency notes: campaign generation and lead scraping run **inline** in the POST handler,
so request time scales with model/Apify latency. `agent_runs` records status for UI polling
and is the natural seam for moving this to background jobs/streaming later.

---

## 10. Configuration & Deployment

Required environment variables (set in Vercel for Production + Preview):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string (**accounts/data live here**). |
| `BETTER_AUTH_SECRET` | Session signing secret. |
| `BETTER_AUTH_URL` | Auth base URL — **must be the deployed domain**. |
| `NEXT_PUBLIC_APP_URL` | Trusted origin for cookies — **must be the deployed domain**. |
| `OPENROUTER_API_KEY` | LLM access. |
| `APIFY_TOKEN` | Lead-scraping actor auth. |
| `APIFY_LEAD_ACTOR` | Override the default Apify actor (optional). |

**Deploy gotchas:**
- Vercel does **not** read `.env.local`; variables must be added in the dashboard, and a
  **redeploy** is required after changing them.
- Accounts only exist in the database referenced by `DATABASE_URL`. If local and Vercel
  point at different databases, a user created in one won't authenticate in the other
  (symptom: "Invalid email or password").
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` pointed at `localhost` on a deployed instance
  will break auth cookies.

---

## 11. Known Limitations / Mock Surfaces

- **B2C images are mock** (static Unsplash pool, not generated).
- **Engagement/KPI metrics** are seeded zeros / illustrative, not real network data.
- **Posting is simulated** — drafts move to `scheduled`, but nothing publishes to the
  actual networks.
- **Generation is synchronous** within the request (no queue/streaming yet).
- **No automated tests**; verification is manual / via the running app.

---

## 12. Recommended Next Steps

1. Replace the mock Unsplash pool with real image generation (DALL·E 3 / Stability),
   storing the result in `drafts.mediaUrl` and the prompt in `drafts.imagePrompt`.
2. Move long-running generation/scraping to background jobs and stream/poll via
   `agent_runs` so requests return immediately.
3. Real publishing + webhook ingestion to populate `drafts.engagements` and `leads.kpiData`.
4. Real-time calendar revalidation so newly generated drafts appear without a refresh.
5. Add validation (`zod`) at every route boundary and a test suite around the generation
   and scheduling flows.
