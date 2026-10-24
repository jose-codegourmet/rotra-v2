## 2. App Architecture

### 2.1 Client App — `apps/client`

The primary player-facing web application. Used by Players, Club Owners, and Que Masters.

| Property | Value |
|----------|-------|
| Framework | Next.js 15 (App Router) |
| Rendering | **SSR-first** — all public-facing pages are server-rendered |
| Auth | Supabase Auth (Facebook OAuth) |
| Real-time | Supabase Realtime (DB row subscriptions) for session events |
| PWA | Yes — installable on mobile via `next-pwa` |

**Why SSR-first:**
- Player profiles, club pages, and leaderboards are **shareable links** that require OG meta tags for rich previews (see `13_sharing.md`). These must be server-rendered to populate `<head>` correctly.
- Session views for the Que Master require hydrated initial state — SSR provides a populated page before Supabase Realtime subscriptions activate, preventing blank loading flickers.
- The gamified leaderboard and tier system should be indexed and SEO-visible.

**Key pages and their rendering strategy:**

| Page | Strategy | Reason |
|------|----------|--------|
| `/dashboard` Home / Dashboard | SSR | Interactive session discovery on the map; user-specific live session data |
| `/find-sessions` Find Sessions | SSR | Browse all open sessions in list mode; shows user's booked upcoming sessions alongside to prevent double-booking |
| `/club/[slug]` | SSR + ISR | Public club page; OG shareable |
| `/player/[id]` | SSR + ISR | Public profile; OG shareable |
| `/session/[id]` | SSR → live hydration | Initial state from server, then Supabase Realtime subscription |
| `/session/[id]/queue` | CSR after hydration | Real-time queue — full client interactivity after mount |
| `/leaderboard` | SSR + ISR | Revalidated on a schedule; SEO-visible |
| `/match/[id]` | SSR + ISR | Match result card; shareable OG |

---

### 2.2 Admin App — `apps/admin`

Internal platform dashboard for the platform team. Not publicly accessible.

| Property | Value |
|----------|-------|
| Framework | Next.js 15 (App Router) |
| Rendering | **SSR-first** — all pages are server-rendered for security |
| Auth | Supabase Auth (email + password + MFA/TOTP) |
| Access | IP-restricted; separate domain from client app |
| Real-time | Polling or lightweight Supabase subscription for live analytics |

**Why SSR-first:**
- All admin data is sensitive — server-rendering means data never touches the browser until the session is verified.
- Kill switch state, environment configs, and approval queues are fetched server-side and streamed to the page, preventing any flash of unprotected content.

**Key admin pages:**

| Page | Description |
|------|-------------|
| `/approvals` | Club Owner application queue (TanStack Table) |
| `/kill-switches` | Feature flag toggle board |
| `/environments` | Dev / Staging / Production config manager |
| `/moderation` | Flagged reviews and account suspensions |
| `/config/gamification` | EXP rates, tier thresholds, badge criteria |
| `/config/skill-dimensions` | Skill dimension manager |
| `/analytics` | Platform-wide metrics dashboard |
| `/audit-log` | Immutable admin action log (TanStack Table, read-only) |

---

### 2.3 Umpire App — `apps/umpire`

A **lightweight, mobile-first PWA** purpose-built for live match scoring. Accessed via one-time token URL — no account required.

| Property | Value |
|----------|-------|
| Framework | Next.js 15 (App Router, minimal pages) |
| Rendering | **Static shell + CSR** — the scoring interface is entirely client-side after token validation |
| Auth | Token-based only (no session/cookie auth required for guest) |
| Real-time | None — umpire scores locally; final score submitted via HTTP |
| PWA | Yes — installable, but no forced install prompt |
| Bundle size | Kept minimal — no heavy dashboard packages loaded |

**Why lightweight / CSR:**
- The Umpire App is a single-screen scoring tool accessed by guests who have never installed anything. A fast initial load is critical.
- No SEO requirement — the page is behind a one-time token and should not be indexed.
- All interaction is tap-based and local-first — scoring is entirely local state until submission.
- Heavy admin packages (`react-table`, Redux devtools, etc.) are **never imported** in this app — Turborepo's package isolation enforces this.

**Key behavior:**
- Token validated on page load (server-side, via Next.js middleware).
- Scoring state managed in Redux Toolkit (local source of truth; synced on submission only).
- Offline resilience: score state persisted locally; full score submitted on reconnect.
- No navigation away from the scoring screen is possible.

---

### 2.4 Shared Packages

#### `packages/db` — Database Layer

- Prisma schema (`schema.prisma`) lives here — single source of truth for the entire DB
- Generates types exported as `@rotra/db`
- The Prisma client is instantiated once here and re-exported; apps import `db` from `@rotra/db`
- Supabase is the underlying Postgres host
- Role resolution helpers (`hasRole`, `isQueMaster`, `isClubOwner`, etc.) also live here — they are thin wrappers over user record fields and belong alongside the DB types

#### `packages/config` — Shared Config

- `tsconfig.base.json` — base TypeScript config extended by all apps
- `tailwind-config/` — shared Tailwind base config with ROTRA tokens

