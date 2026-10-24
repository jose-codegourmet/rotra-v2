## 3. Tech Stack Reference

### 3.1 Core Framework

| Technology | Version | Used In | Reason |
|------------|---------|---------|--------|
| **Next.js** | 15 (App Router) | All apps | SSR, routing, middleware, image optimisation, edge functions |
| **TypeScript** | 5.x | All apps & packages | End-to-end type safety across monorepo; Prisma generated types flow into API and UI |
| **React** | 19 | All apps | Concurrent features, Server Components, Suspense streaming |

**Next.js 15 App Router** is used across all three apps because:
- Server Components allow sensitive data (DB queries, auth checks) to stay on the server with zero client bundle cost.
- Layouts handle role-based auth guards at the router level.
- Middleware handles token validation for the Umpire App before the page renders.
- Streaming with Suspense gives progressive loading on data-heavy pages (admin analytics, leaderboard).

---

### 3.1.1 Next.js 15 — Breaking Changes & Coding Rules

Next.js 15 introduced several async APIs that **break silently at runtime but fail loudly at build time**. Every page and layout author must follow these rules.

#### Dynamic Route `params` are a Promise

In Next.js 15, the `params` prop passed to `page.tsx`, `layout.tsx`, `generateMetadata`, and `generateStaticParams` is now a **`Promise`**, not a plain object.

**Wrong (Next.js 14 style — fails to build in Next.js 15):**
```tsx
export default function ClubProfilePage({ params }: { params: { clubId: string } }) {
  const { clubId } = params // ❌ TypeScript error: params is Promise<any>
  ...
}
```

**Correct (Next.js 15):**
```tsx
export default async function ClubProfilePage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params // ✅
  ...
}
```

**Rules:**
1. **Always type `params` as `Promise<{ ... }>`** — never the raw object shape.
2. **Always make the component `async`** — you cannot `await` inside a sync Server Component.
3. **Applies everywhere `params` is consumed** — `page.tsx`, `layout.tsx`, `generateMetadata`, `generateStaticParams`.
4. **`searchParams` follows the same pattern** — `searchParams: Promise<{ [key: string]: string | string[] | undefined }>`.

**`generateMetadata` example:**
```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clubId: string }>
}): Promise<Metadata> {
  const { clubId } = await params
  return { title: `Club ${clubId} — ROTRA` }
}
```

> **Why this changed:** Next.js 15 made dynamic APIs asynchronous to support streaming and partial prerendering (PPR). `params` is resolved lazily on the server — awaiting it opts the segment into dynamic rendering only when necessary.

---

### 3.2 State Management

| Technology | Used In | Scope |
|------------|---------|-------|
| **Redux Toolkit** | Client, Umpire | Client-side global state — session state, real-time queue, offline point queue |
| **React Query (TanStack Query v5)** | Client, Admin | Server state — data fetching, caching, mutations, background refetching |

**Redux Toolkit** manages state that is:
- Continuously updated via WebSocket (queue changes, player statuses, live scores)
- Needed across multiple unrelated components simultaneously (e.g. the session queue is read by the Court View, Queue View, and Player Pool simultaneously)
- Requiring offline resilience (Umpire App's local point queue during disconnection)

**React Query** manages state that is:
- Fetched from the API and cached (player profiles, match history, leaderboard data)
- Mutated with optimistic updates (marking a player as "I Am In", submitting a review)
- Invalidated after mutations (refetch leaderboard after match completion)

**They are complementary, not overlapping:**
- React Query owns *fetched server data* (async, cached, stale-while-revalidate)
- Redux Toolkit owns *live session state* (pushed from WebSocket, requires real-time consistency)

**Redux Toolkit is NOT used in the Admin App** — admin pages are SSR-first and use React Query + Next.js Server Actions for mutations. No persistent client state is needed.

---

### 3.3 Data Layer

| Technology | Version | Role |
|------------|---------|------|
| **Prisma** | 6.x | ORM + type generation |
| **Supabase** | Hosted Postgres | Primary database + Supabase Auth + Realtime |
| **Supabase Realtime** | — | DB row-change subscriptions for smart monitoring and score submission notifications |

**Prisma + Supabase** is used because:
- Prisma provides a fully typed query builder — the generated types from `schema.prisma` propagate through the entire codebase, preventing schema drift between DB and UI.
- Supabase provides managed Postgres with row-level security (RLS) for multi-tenant club data isolation.
- Supabase Realtime listens to Postgres row changes and pushes them to subscribed clients — no separate message broker or custom WebSocket server needed.
- Prisma handles all write operations; Supabase Realtime handles targeted push notifications (smart monitoring alerts, score submission) — clean separation of concerns.

**Row Level Security (RLS) strategy:**
- Club data is isolated per club — members can only read their own club's sessions.
- Umpire tokens are scoped to a single match row; token validation is enforced at the DB level.
- Admin App bypasses RLS using a service role key stored only on the server.

---

### 3.4 Styling

| Technology | Version | Used In |
|------------|---------|---------|
| **Tailwind CSS** | 4.x | All apps |
| **shadcn/ui** | Latest | Each app's own `src/components/shadcn/` |
| **CSS Custom Properties** | — | ROTRA design tokens as CSS variables |

**Tailwind CSS 4** is used because:
- Utility-first classes map directly to the ROTRA spacing, color, and typography tokens.
- Tailwind's JIT mode produces minimal CSS — critical for the Umpire App's lightweight target.
- The shared `packages/config/tailwind-config` package ensures every app uses identical tokens.

**Breakpoints and container queries use explicit px values** — Tailwind v4's defaults are rem-based, which we override. All responsive variants (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) and container query variants (`@sm:`, `@md:`, etc.) produce px-based `@media` / `@container` rules. See [section 4.6](./05_coding_design_system.md#46-responsive-breakpoints--container-queries) for details.

**shadcn/ui** is used because:
- It generates unstyled, accessible component primitives (built on Radix UI) into the codebase — components are owned and modified, not installed as a black-box dependency.
- shadcn's theming system uses CSS custom properties, which maps cleanly to the ROTRA token system.
- Components are generated into each app's `src/components/shadcn/` and customized to match the ROTRA dark-mode-only design.

> shadcn/ui components are **not installed as an npm package** — they are generated into each app's `src/components/shadcn/` and owned by that app.

---

### 3.5 Data Tables

| Technology | Used In | Reason |
|------------|---------|--------|
| **TanStack Table (react-table) v8** | Admin App | Kill switch tables, approval queues, audit logs, analytics grids |

TanStack Table is used exclusively in the Admin App for:
- Sortable, filterable kill switch registry
- Approval queue with row actions (approve / reject)
- Immutable audit log (read-only, virtualized for large datasets)
- Platform analytics breakdowns

The Client App does **not** use TanStack Table — player-facing lists (leaderboard, match history, queue) use app-local `PlayerRow` and `MatchCard` components in `apps/client/src/components/` that are optimized for mobile dense layouts, not data grid patterns.

---

### 3.6 Authentication

| App | Method | Technology |
|-----|--------|------------|
| Client App | Facebook OAuth | Supabase Auth |
| Umpire App | One-time token (guest) or Supabase session (authenticated) | DB token lookup in Next.js middleware |
| Admin App | Email + password + TOTP MFA | Supabase Auth |

**Client App auth flow:**
- Facebook OAuth via Supabase Auth's built-in Facebook provider
- On first login: server creates a Player record seeded with Facebook name + photo
- Supabase issues JWTs; sessions managed via `@supabase/ssr` cookie helpers in Next.js App Router
- Role claims (`player`, `club_owner`, `que_master`) stored as custom claims in the Supabase Auth JWT via an Auth Hook and re-validated on sensitive mutations

**Umpire App auth:**
- Token URL (`/umpire/[token]`) — token is a DB row looked up in Next.js middleware before the page renders
- If the user is not logged in (no Supabase session cookie), they score as a guest — no rating capability
- If they are logged in (Supabase session present), their identity is attached to the score submission

**Admin App auth:**
- Email + password with TOTP MFA via Supabase Auth's built-in MFA support
- Sessions managed via `@supabase/ssr`; expire after 4 hours of inactivity (configured in Supabase Auth settings)
- Uses a separate Supabase Auth user pool scoped to the admin domain — no overlap with player accounts
- Admin App uses the Supabase service role key server-side to bypass RLS

---

### 3.7 Notifications

| Type | Technology | Used By |
|------|------------|---------|
| Push (in-app) | Supabase Realtime subscription | Queue updates, match assignments, waitlist promotion |
| Push (device) | Web Push API via service worker | Umpire assignment notification, no-show alerts |
| In-app toasts | App-local Toast component | Action confirmations, real-time event feedback |

---

### 3.8 Infrastructure & Tooling

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (workspaces) |
| **Turborepo** | Monorepo build orchestration |
| **Vercel** | Deployment (each Next.js app — landing, client, admin, umpire — as its own Vercel project when applicable) |
| **Supabase** | Hosted Postgres + Realtime + Storage (player photos) |
| **Prettier** | Code formatting (shared config in `packages/config`) |
| **Biome** | Linting (configured at workspace root via `biome.json`) |
| **Husky** | Git hooks (`pre-commit`: lint; `pre-push`: lint + build) |
| **commitlint** | Enforces Conventional Commits format on every commit message |

For pinned Node/pnpm/Biome versions and the Vercel + Supabase runtime contract, see [`13_runtime_versions.md`](./13_runtime_versions.md).

---

### 3.9 Component Development — Storybook

Each app has its own `.storybook/` configuration. There is no shared design system Storybook — every component is owned by the app that uses it.

| Location | Scope | Who Uses It |
|----------|-------|-------------|
| `apps/client/.storybook` | Client components (`PlayerRow`, `CourtCard`, `SessionSetupForm`, etc.) | Frontend dev working on the client app |
| `apps/admin/.storybook` | Admin components (`KillSwitchRow`, `ApprovalCard`, data tables, etc.) | Frontend dev working on the admin app |
| `apps/umpire/.storybook` | Umpire components (`ScoreDisplay`, `PointButton`, etc.) | Frontend dev working on the umpire app |

**Why per-app Storybook:**

All components are app-local — there is no shared library to maintain. Each app's Storybook covers only the components that app owns, keeping stories co-located with the code they test and eliminating cross-app dependency overhead.

**Storybook conventions:**

- Stories must cover: default state, all named variants, disabled/loading states, and dark-mode (always active)
- Complex or stateful components should have stories; simple presentational components are encouraged but not required
- Each app's Storybook imports the shared Tailwind config from `packages/config` and its own `src/app/globals.css` so tokens render correctly

---

### 3.10 Maps & Geolocation

| Technology | Version | Used In | Role |
|------------|---------|---------|------|
| **Mapbox GL JS** | 3.x | Client App (`/dashboard`) | WebGL map renderer, custom dark style |
| **react-map-gl** | 8.x (vis.gl) | Client App | React bindings (`Map`, `Marker`, `Popup`) |
| **Mapbox Geocoding API** | — | Client App (server routes) | Resolve venue text → `venue_lat` / `venue_lng` on session create |
| **Browser Geolocation API** | — | Client App | Center map on user's position |

**Why Mapbox (not Google Maps):**

- Custom dark Studio styles align with ROTRA's `surface-dim` (#131314) palette without fighting default light tiles.
- Airbnb-style discovery UX (pins, tooltips, list/map toggle) is well-supported by `react-map-gl`.
- Geocoding API shares the same token and billing account.

**OSS fallback:** [MapLibre GL JS](https://maplibre.org/) uses the same `react-map-gl` adapter with a different map provider for tiles. Documented in [`PLAN_phase_0_foundation.md`](../../PLAN_phase_0_foundation.md) if Mapbox pricing becomes a concern.

**Environment variables (`apps/client`):**

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
NEXT_PUBLIC_MAPBOX_STYLE_URL=mapbox://styles/rotra/dark-v1
```

Restrict the public token by HTTP referrer in the Mapbox dashboard (localhost + production domains only).

**Coding rules:**

1. **Map components MUST be client-only.** Import Mapbox via `next/dynamic({ ssr: false })` or a dedicated `"use client"` module. Never import `mapbox-gl` in Server Components.
2. **Import Mapbox CSS once** in `apps/client/src/app/globals.css`: `@import "mapbox-gl/dist/mapbox-gl.css";`
3. **Geocoding runs server-side** in API routes (`/api/sessions/quick`, future session setup) — do not expose geocoding tokens beyond the public Mapbox token scope.
4. **Distance calculation** uses Haversine in `apps/client/src/lib/geo/haversine.ts` for v1. PostGIS `ST_DWithin` is optional for scale.
5. **Sessions without coordinates** (`venue_lat` / `venue_lng` NULL) appear in List/Grid discovery only — not as map pins.
6. **State:** map viewport and selected pin are React local state. Nearby session data uses React Query (`useSessionDiscovery`). View mode (map/list/grid) uses Redux `uiSlice.dashboardViewMode`.

**Key files:**

| Path | Purpose |
|------|---------|
| `apps/client/src/components/modules/dashboard/dashboard-map/` | Map, pins, tooltips |
| `apps/client/src/lib/geo/haversine.ts` | Distance between user and session |
| `apps/client/src/lib/geo/geocode.ts` | Address → coordinates (Phase 3+) |
| `apps/client/src/hooks/useSessionDiscovery.ts` | React Query hook for nearby sessions |
| `apps/client/src/app/api/sessions/discover/route.ts` | Discovery API |

**References:**

- View spec: [`docs/views/client_app/common/session_discovery_dashboard.md`](../views/client_app/common/session_discovery_dashboard.md)
- Implementation phases: [`PLAN_session_discovery_dashboard.md`](../../PLAN_session_discovery_dashboard.md)

---
