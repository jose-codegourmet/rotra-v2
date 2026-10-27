# AGENTS.md — ROTRA

> **Entry point for AI coding agents.** Read this file completely; it is deliberately short. Everything
> else is loaded **on demand** through the routing table in §3. Don't read the whole `docs/` tree.

**Last verified:** 2026-10-27 · **Budget:** under 200 lines.

---

## 0. Non-negotiables

1. **Never invent** a screen, route, field, API, component, or domain term. If it isn't in the docs
   or existing code, stop and ask.
2. **Nothing is built yet.** `apps/` is empty and the docs describe the *target*. Never say a feature
   works unless you ran it.
3. **Match the prototypes.** `docs/frames/*/*.html` are the agreed design. Build to them; don't redesign.
4. **Words from [product-terms.md](docs/product-terms.md) only.** Queue (never "Que"), Queue Session,
   Queue Master, Match done ≠ Session done, invalid (never "void"). **ROTRA** in all caps in UI copy.
5. **Every epic starts with components + Storybook**, then mock data, then screens, then states.
6. **Component folder:** `my-thing/MyThing.tsx` + `MyThing.stories.tsx` + `MyThing.meta.ts`. Forms
   add `MyForm.defaultValues.ts` + `MyForm.schema.ts`. Field rules that two forms share live in `@rotra/schema`.
7. **All visual components live in `@rotra/ui`.** A route's `_components/` only wires data to them.
8. **No barrel files** (`index.ts` re-exports) anywhere. Packages expose `exports` subpaths.
9. **No hardcoded colors.** Tokens only. Both themes ship; dark is the default.
10. **Next.js 16:** `await` params / searchParams / cookies / headers; `proxy.ts`, never `middleware.ts`.
11. **No Server Actions, no Realtime channels, no new dependencies** without a decision.
12. **Prisma schema is split** into entity-group files by product. Never one big `schema.prisma`.
13. **Always `nvm use &&` before** `pnpm`, `node`, `npx`, or `make`. If `nvm` isn't a shell function,
    `source ~/.nvm/nvm.sh` first.
14. **Ask before guessing** anything listed in an `open-decisions.md`, and anything about money,
    ranking math, permanent results, auth, contacts, or migrations.

---

## 1. What ROTRA is

A **badminton session operating system** for club nights. *Run the game.* Utility software, not a
social network. Three v1 products:

| Product | App | Who | Prototype |
|---|---|---|---|
| **Queue** (main v1 focus) | `apps/queue` | The club account, run by the Queue Master | [rotra-queue.html](docs/frames/queue-app/rotra-queue.html) |
| **Player Information** | `apps/player` | Public visitors + registered players | [rotra-player.html](docs/frames/player-app/rotra-player.html) |
| **Admin** | `apps/admin` | The platform owner | [rotra-admin.html](docs/frames/admin-app/rotra-admin.html) |

World (nearby-club discovery) is v2. Build nothing for it. Old features (MMR, EXP, peer reviews,
Umpire, tournaments, Facebook login) are **not** v1. See [product terms §14](docs/product-terms.md#14-words-that-mean-not-v1--stop-and-ask).

**Current phase:** building the apps on **mock data** (TanStack Query hooks over an in-memory mock store).
Supabase + Prisma come later and replace only the fetchers.

---

## 2. Repo map

```text
apps/                     queue · player · admin (Next.js 16), empty until the Foundation scaffold
packages/
  ui/                     every visual component and form + the one Storybook
  data/                   types, fixtures, mock store, fetchers, query keys, hooks
  schema/                 shared Zod fields (email, phone, date, money, password)
  config/                 tsconfig + Tailwind 4 tokens (current file is old; replaced by Foundation)
  db/                     Prisma + services (database epic, later)
docs/
  architecture.md         apps, packages, dependency rules, data flow, offline, auth, database
  coding-conventions.md   how to write components, forms, pages, hooks, styles, Prisma
  ways-of-working.md      epics/tickets, PRs, Definition of Done, verification, reviews
  product-terms.md        every domain word, its meaning, and its code name
  business_logic/product/ WHAT the product does: rules per product › module (+ flow/ journeys)
  screens/product/        WHAT each screen shows: layouts, controls, states, dialogs, by screen ID
  database_design/product/ proposed tables and fields per module
  frames/                 the three clickable prototypes (+ README per app)
  branding/               brand identity, logo, characters (visuals: the prototypes win)
  email-templates.md      Supabase auth email coverage
email-templates/          auth email HTML, pasted into the Supabase dashboard by hand
```

---

## 3. Context routing: read only what your task needs

| If your task is… | Read, in order |
|---|---|
| **Anything** | This file |
| Anything using a domain word, or naming a type/route/component | [product-terms.md](docs/product-terms.md) |
| Picking up or writing a **ticket / epic / PR** | [ways-of-working.md](docs/ways-of-working.md) §3–7 |
| Building a **component** in `@rotra/ui` | [coding-conventions.md](docs/coding-conventions.md) §2–5, §8 → the prototype screen named in the ticket |
| Building a **form** | [coding-conventions.md](docs/coding-conventions.md) §6–7 → the screen doc's field rules |
| Adding a **page / route / container** | [architecture.md](docs/architecture.md) §4 → [coding-conventions.md](docs/coding-conventions.md) §9 → [navigation.md](docs/screens/product/navigation.md) |
| **Mock data, hooks, Redux** | [architecture.md](docs/architecture.md) §5, §7 → [coding-conventions.md](docs/coding-conventions.md) §10 |
| Adding a **package, app, or dependency** | [architecture.md](docs/architecture.md) §2–3 → ask first |
| **A Queue screen** | [screens/…/queue/\<module\>.md](docs/screens/product/modules/queue/README.md) → [rotra-queue.html](docs/frames/queue-app/rotra-queue.html) → its business module |
| **A Player Information screen** | [screens/…/player-information/\<module\>.md](docs/screens/product/modules/player-information/README.md) → [rotra-player.html](docs/frames/player-app/rotra-player.html) |
| **An Admin screen** | [screens/…/admin/\<module\>.md](docs/screens/product/modules/admin/README.md) → [rotra-admin.html](docs/frames/admin-app/rotra-admin.html) |
| Shared screen rules (sheets, toasts, touch sizes, a11y, sync labels) | [experience-contract.md](docs/screens/product/experience-contract.md) |
| Loading / empty / error / offline / permission states | [state-matrix.md](docs/screens/product/state-matrix.md) |
| A confirmation dialog (`D-…`) | [dialogs.md](docs/screens/product/dialogs.md) |
| **Product behavior** (what a rule is) | [business_logic/product/README.md](docs/business_logic/product/README.md) → that product's `modules/<module>/README.md` |
| Is something still undecided? | [business open decisions](docs/business_logic/product/open-decisions.md) · [screen open decisions](docs/screens/product/open-decisions.md) · [database open decisions](docs/database_design/product/open-decisions.md) |
| **Domain math** (cost, minimum games, queue generation, rank, awards) | The business module → [coding-conventions.md](docs/coding-conventions.md) §14 → ask |
| **Prisma / tables** (database epic) | [database_design/product/README.md](docs/database_design/product/README.md) → [conventions](docs/database_design/product/conventions.md) → [coding-conventions.md](docs/coding-conventions.md) §13 |
| **Offline** (Queue) | [architecture.md](docs/architecture.md) §9 → [offline module](docs/business_logic/product/queue/modules/offline/README.md) |
| An **auth email template** | [email-templates.md](docs/email-templates.md) |
| **Two docs disagree** | [ways-of-working.md](docs/ways-of-working.md) §2 |

**Rule:** if a file you loaded didn't change what you wrote, you didn't need it.

---

## 4. Which source wins (short version)

Behavior: **business docs**. Look and copy: **the prototype**, then the screen docs. Words:
**product-terms.md**. Structure and code style: **architecture.md + coding-conventions.md**. What runs:
**the code**, and only the code. Open decisions: **ask**. Full table: [ways-of-working.md §2](docs/ways-of-working.md#2-which-source-wins).

---

## 5. Commands

The scaffold ticket rewrites the root scripts and `Makefile`; until then they point at removed apps.
Target commands:

```bash
nvm use && pnpm install
nvm use && pnpm dev                          # all apps
nvm use && pnpm --filter @rotra/queue dev    # or @rotra/player, @rotra/admin
nvm use && pnpm --filter @rotra/ui storybook
nvm use && pnpm lint                         # Biome
nvm use && pnpm type-check
nvm use && pnpm build
```

---

## 6. Picking up work

Tickets are GitHub issues labeled `ticket`, sub-issues of `epic` issues, titled
`<seq> · <key> · <Type>: <what>`. Take the **lowest open `<seq>`** whose *Depends on* issues are closed.
Open one PR per ticket with `Closes #<n>`, run lint/type-check/build locally, then
`gh pr merge --squash --auto --delete-branch`. **CI never blocks; PRs auto-merge.** Can't do a ticket as
written? Comment why, label it `blocked`, take the next. Full rules: [ways-of-working.md §3, §5](docs/ways-of-working.md#picking-up-the-next-ticket-agents).

---

## 7. Definition of Done (short version)

Lint, type-check, and build pass. Components have stories (both themes) and a `.meta.ts`. It matches the
prototype at 375 px and 1280 px in dark and light. Docs updated in the same PR if anything became untrue.
The PR says exactly what was verified and what wasn't. Full list: [ways-of-working.md §6–7](docs/ways-of-working.md#6-definition-of-done).
