# AGENTS.md — ROTRA

> **Entry point for AI coding agents.** Read this file completely. It is deliberately small.
> Everything deeper is loaded **on demand** via the routing table in §2 — do not read the whole
> `docs/` tree or `docs/REPO_SUMMARY.md` "just in case."

**Last verified against the tree:** 2026-08-30 · **Budget:** this file stays under 290 lines.

---

## 0. Non-negotiables

Violating any of these produces a diff that will be rejected. They cost you nothing to obey.

1. **Never invent** APIs, screens, routes, DB columns, or domain terms. If it is not in this file,
   an OpenSpec, or existing code — stop and ask.
2. **Never claim a documented rule is shipped.** `docs/business_logic/` contains rules that were
   never built. Only `openspec/specs/` + code prove implementation.
3. **Polished UI ≠ wired backend.** Grep for `MOCK_` before assuming a screen persists anything.
4. **Spelling is load-bearing:** `Que Master` (never "Queue Master"), `Que Session` /
   `Que Schedule` (synonyms), `Quick Umpire`, `Rate and Review`, **ROTRA** all-caps in UI copy.
5. **Writes go through route handlers**, not Server Actions. Exactly one `'use server'` file exists
   (`apps/client/src/lib/auth/login-actions.ts` — Facebook OAuth only) unless a spec says otherwise.
6. **No new barrel files in app code.** Do not add `index.ts` re-exports under `apps/`. Package
   entrypoints are the exception: `packages/db/src/index.ts` and `packages/legal-content/src/index.ts`
   are sanctioned. Existing app barrels are debt — see `docs/tech-debt.md` — not precedent.
7. **No hardcoded hex in components.** Tailwind / CSS-variable tokens only. **Both themes ship**
   (dark default, light toggleable on client). Hex literals freeze dark values and break light mode.
   **Exception: email templates** (§5) — inline hex and table layout are required there.
8. **Next.js 15 dynamic routes:** `params` and `searchParams` are `Promise<...>` and must be
   `await`ed. Sync pages without dynamic props are fine and common.
9. **Mapbox is client-only** — `next/dynamic({ ssr: false })` or `"use client"`. No Google Maps.
10. **No new realtime channels.** Supabase Realtime is **not built** (zero subscriptions in apps).
    Two cases are specified but unimplemented. Do not invent channels; use React Query refetch.
11. **No async thunks in Redux slices.** Async is React Query's job. Redux holds auth + UI chrome only.
12. **Test coverage is near-zero and that is deliberate.** Nothing catches your regression. Verify
    manually and state exactly what you verified. Do not add a test runner or component tests
    unprompted — see `docs/ways-of-working.md` §6.1.
13. **Always `nvm use` before Node tooling.** Prefix every `pnpm` / `make` / `node` / `npx`
    command with `nvm use &&` so the shell matches `.nvmrc` (Node 24). If `nvm` is not a
    function in this shell, `source ~/.nvm/nvm.sh` first. Never assume a leftover Node.

---

## 1. What ROTRA is

A **badminton session operating system** for club nights: queue-based match management, player
identity + peer skill ratings + MMR, transparent court/shuttle cost splitting, club operations,
and gamified EXP/tiers. Utility infrastructure, **not** a social network. Tagline: *Run the game.*

Four Next.js apps in a pnpm/Turborepo monorepo:

| App | Package | Port | Purpose | Maturity |
|-----|---------|------|---------|----------|
| Landing | `@rotra/landing` | 3003 | Coming-soon + waitlist + legal | Real, small |
| Client | `@rotra/client` | 3000 | Players / Club Owners / Que Masters | **Real core + large mock surface** |
| Admin | `@rotra/admin` | 3001 | Internal ops | **Real core + mock dashboards** |
| Umpire | `@rotra/umpire` | 3002 | Live scoring PWA | **Stub. One page. Nothing built.** |

Shared: `@rotra/db` (Prisma + domain services), `@rotra/config` (tsconfig + Tailwind tokens),
`@rotra/legal-content`.

---

## 2. Context routing — read only what your task needs

Find your task, load those files, ignore the rest. Each row is roughly self-sufficient.

| If your task is… | Load, in order |
|------------------|----------------|
| **Any task** | This file (you are here) |
| Add/modify a **page or route** | `.agents/context/architecture.md` → the neighboring `page.tsx` |
| Add/modify an **API route** | `.agents/context/architecture.md` + `.agents/context/data-layer.md` |
| Touch **state / hooks / Redux** | `.agents/context/state.md` |
| Touch **Prisma / schema / services** | `.agents/context/data-layer.md` + `packages/db/AGENTS.md` |
| Build a **component** | `.agents/context/components.md` + `.agents/context/design-tokens.md` |
| Build or fix a **form** | `.agents/context/forms.md` (then run `/rotra-is-my-form-valid`) |
| Change **product behavior** | `openspec/specs/<domain>/spec.md` first (+ `.agents/context/spec-index.md`) |
| Anything using domain vocabulary | `.agents/context/glossary.md` |
| "Is X actually built?" | `.agents/context/implementation-status.md` |
| "Docs contradict the code" | `.agents/context/known-drift.md` — **Reality** wins |
| Commands / ports / CI / env | `.agents/context/commands.md` |
| Wire **mock → real** | `docs/ways-of-working.md` Mock→Real checklist |
| Working inside one app | `apps/<app>/AGENTS.md` |
| Add/modify an **auth email template** | `docs/email-templates.md` (coverage matrix) + §5 "Auth email" |
| Human onboarding / deep audit | `docs/REPO_SUMMARY.md` (large — not for typo fixes) |

**Rule:** if a loaded file did not change what you wrote, you did not need it — prefer grepping code.

---

## 3. Authority order

When sources disagree:

1. **The code that is wired** — what actually runs
2. **`openspec/specs/<domain>/spec.md`** — current *implemented* behavior (SHALL/MUST + scenarios)
3. **`.agents/context/known-drift.md`** — the known list of docs that lie
4. **This file** — orientation
5. **`docs/business_logic/`** — product *intent*; may be unbuilt
6. **`docs/techstack/`** — conventions, but several sections are stale (see drift file)

`docs/REPO_SUMMARY.md` is a *narrative* view. When it conflicts with an OpenSpec, the spec wins.

---

## 4. Vocabulary agents get wrong

Full glossary: `.agents/context/glossary.md`. These four confusions cause the most bad code:

- **Skill Rating ≠ MMR ≠ Tier ≠ Playing level.** Four separate concepts. Skill Rating is peer-
  computed 1.0–5.0 across six dimensions on all session types. MMR is the competitive ladder
  (starts 1000, floor 0) and moves **only** in a Club Que Session of type `MMR`. Tier is a
  cosmetic EXP badge. Playing level is self-declared and cosmetic.
- **`Fun Games` ≠ `Friendly`.** `Fun Games` is a *club* session type with no EXP/MMR. `Friendly`
  is an informal clubless session.
- **Admission state ≠ Player status.** Admission = do you have a seat (Accepted/Waitlisted).
  Status = what you are doing now (`Not Arrived` → `I Am In` → `I Am Prepared` → Playing/Waiting).
- **Match Queue ≠ session waitlist ≠ Automatic Queueing.** Ordered matches inside a session vs
  overflow FIFO for seats vs the matchmaking candidate engine. Three mechanisms.

Also: **Voided** matches reverse EXP/MMR — never call them "Unscored."

---

## 5. Architecture in one screen

**Rendering:** client + admin are **SSR-first** at the page layer (server `page.tsx` → client
islands). Landing is sync Server Components. Umpire is a stub.**The canonical write path — match this:**

```
Client Component
  → TanStack Query useMutation
  → hooks/<useFeature>/server.ts   (typed fetch; queryKey.ts colocated)
  → app/api/<feature>/route.ts     ← the HTTP boundary
  → packages/db/src/<feature>-service.ts  (when a service exists)
  → Prisma → Supabase Postgres
```

Note: `apps/client/src/lib/api/` is **server-side** Prisma helpers used by routes/SSR — not the
client fetch layer. Admin has no `lib/api/`. Many routes still call `db.*` inline (debt).

**State split:**

| TanStack Query | Redux Toolkit (auth + UI only) |
|----------------|--------------------------------|
| Profiles, sessions live/roster/console, clubs, admin tables | `authSlice` (Supabase user) |
| All mutations + `invalidateQueries` | `uiSlice` (drawer, dashboard view mode) |

Local UI chrome → React local state. Never reach for Redux for something a `useState` covers.

**Realtime:** not implemented. Specs describe two future cases; do not code them without a change.

**Auth:** Client = Facebook OAuth (+ tester/admin gate paths) via Supabase + middleware, no MFA.
Admin = email + password primary; OTP exists for invite/recovery, not the main login card.
Umpire = one-time token (**docs only**). Landing = public.

**Auth email:** templates are **copy-paste artifacts, not build inputs**. Authored as standalone
HTML in `apps/<app>/src/email-templates/` (app-specific) or root `email-templates/` (shared across
apps), then pasted into **Supabase Dashboard → Authentication → Emails → Templates**. Supabase
renders the Go-template vars (`{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .TokenHash }}`,
`{{ .RedirectTo }}`, `{{ .Email }}`) and relays delivery through **Resend** (custom SMTP). No app
code imports these files. Inline CSS + table layout only — no Tailwind, no design tokens, no JSX.
Supabase exposes **13 slots** (6 authentication + 7 security notification). One project means
**one deployed body per slot**, so per-app files are audience branches composed at paste time.
Current coverage is **3 of 26** — the checklist in `docs/email-templates.md` is authoritative.

---

## 6. Where new code goes

| Adding… | Path |
|---------|------|
| Page / URL | `apps/<app>/src/app/.../page.tsx` |
| HTTP API | `apps/<app>/src/app/api/<feature>/route.ts` |
| DB query/mutation logic | `packages/db/src/<feature>-service.ts`, called from the route |
| UI primitive | `apps/<app>/src/components/ui/<kebab-name>/` |
| Feature module UI | `apps/<app>/src/components/modules/<feature>/` |
| React Query hook | `apps/<app>/src/hooks/useFeature/` — match neighbors |
| Fetch helpers / query keys | `hooks/useFeature/{server,client,queryKey}.ts` |
| Auth / UI chrome Redux | `apps/<app>/src/store/slices/<feature>Slice.ts` |
| Storybook fixtures | `apps/<app>/src/constants/` — prefer shared mocks over inlined |
| Form | colocated `SomeForm/{SomeForm.tsx,schema.ts,default.ts}` |
| Shared legal copy | `packages/legal-content` |
| Design tokens | `packages/config/tailwind-config` |
| Auth email template (one app) | `apps/<app>/src/email-templates/<name>.html` |
| Auth email template (shared) | `email-templates/<provider>/<name>.html` |

**Folder names:** `components/ui/` + `components/modules/`. Older docs say `shadcn/` + `rotra/` —
those directories do not exist. Admin also has `admin-ui/`, `layout/`, `custom/`, `providers/`.

**Naming:** kebab-case UI folders · `PascalCase.tsx` · camelCase hooks (`useSessionLive`) ·
`[feature]Slice.ts` · `SCREAMING_SNAKE_CASE` constants · `ComponentNameProps` in the `.tsx`.

---

## 7. Reality check — the traps

Full table: `.agents/context/implementation-status.md`. The ones that burn agents most:

1. **Umpire app is a stub** with 5 OpenSpecs and no implementation.
2. **Client `/sessions/*` (join, queue, court, attendance, add-match, play Courts/Queue/Standings)** is mock theatre (`MOCK_SESSION_*` / `MOCK_PLAYER_*` +
   toasts). The **real** live session stack is **`/find-sessions` and `/find-sessions/[sessionId]`**.
3. **Admin `/dashboard`, `/analytics`, `/moderation`, `/platform-config`, `/kill-switches`,
   `/skills-management`, `/mmr-management`** are mock or in-memory. Edit does not save.
4. **Clubs beyond `/clubs/apply`** are mock lists and `ProvisionBox` stubs.
5. **RLS is enabled on the `places` table only**, despite broad RLS in `docs/database/`.
6. **`/profile` is PARTIAL** — identity from API; stats / match history / skills / gear still
   `MOCK_PLAYER`.
7. **Email templates do not ship on merge.** Editing `*/email-templates/*.html` changes nothing
   until a human pastes it into the Supabase dashboard. Most of the 13 slots have no committed
   template yet — check `docs/email-templates.md` before assuming one exists.

Known contradiction: canonical rules say only Club Owner / Que Master may create Que Sessions,
but code allows player **Quick Session** create (`POST /api/sessions/quick`). Do not "fix"
either side without a spec change.

---

## 8. Commands

**Always `nvm use` first** (see §0.13). Then:

```bash
nvm use && pnpm install        # Node 24, pnpm 11
nvm use && pnpm approve-builds # first install only

nvm use && make dev            # all apps (+ ngrok); SKIP_NGROK=1 to skip
nvm use && make dev-client     # or dev-admin / dev-umpire / dev-landing

nvm use && pnpm lint           # biome — CI gate (client/admin/umpire)
nvm use && pnpm type-check     # tsc --noEmit — CI gate (after pnpm db:generate)
nvm use && pnpm build          # NOT in CI, but pre-push hook runs it
nvm use && make check-fix      # biome autofix

nvm use && pnpm db:generate    # also: db:push | db:migrate | db:studio | db:seed
```

Hooks: `pre-commit` = lint · `pre-push` = lint + build · `commit-msg` = commitlint.
CI runs **Biome lint** (client/admin/umpire; landing excluded) and **`pnpm type-check`** on PRs.

---

## 9. Definition of done

- [ ] `pnpm lint` and `pnpm type-check` pass — both run in CI on PRs
- [ ] `pnpm build` passes for every app you touched
- [ ] New/changed components have a `.stories.tsx`; prefer fixtures from `src/constants/`
- [ ] Forms use `FormProvider` + `Field` + `Controller`, colocated Zod schema, toast on success
      **and** failure (sonner)
- [ ] No new `MOCK_` constant left behind as the shipping path
- [ ] Conventional Commit message (`feat:`, `fix:`, `chore:`, …)
- [ ] If behavior changed: matching OpenSpec updated or an OpenSpec change proposed
- [ ] The PR description states **what you manually verified** — coverage is thin by design
- [ ] Domain math (cost, MMR, EXP) touched? Unit tests are **required** there — see
      `docs/ways-of-working.md` §6.1. Do not add tests or a test runner elsewhere without asking.
- [ ] Changed an email template? The PR says so — it takes effect only once pasted into the
      Supabase dashboard (Authentication → Emails → Templates).

---

## 10. Stop and ask

Do not guess. Open a question instead when:

- The task requires an API, screen, or field that does not exist yet
- `docs/business_logic/` and `openspec/specs/` disagree and the drift file does not cover it
- You would need to add a new Realtime channel, a Server Action, or a new app-level barrel
- You would need to promote a mock screen to real without a spec describing the behavior
- The change touches money (cost splitting), MMR math, or EXP — these have exact formulas and
  reversal semantics; get the spec, do not improvise

Use `.cursor/commands/opsx-explore` to think without implementing, and `opsx-propose` to write
planning artifacts **without** touching code in the same turn.
