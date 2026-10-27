# Coding conventions — ROTRA v1

**Last verified:** 2026-10-27 · **Applies to:** every app and package. Where this file and older notes
disagree, this file wins. Where this file and the [architecture](architecture.md) disagree, fix one of them
in the same PR.

**Read the section you need**, not the whole file:

| Task | Section |
|---|---|
| Any code | §1 Stack, §2 Naming and imports |
| A component in `@rotra/ui` | §3 Components, §4 Meta files, §5 Storybook, §8 Styling |
| A form | §6 Forms, §7 Shared schemas |
| A page, layout, or route container | §9 Next.js 16 |
| Data hooks, mock store, Redux | §10 Data and state |
| Animation | §11 Motion |
| A table | §12 Tables |
| Prisma schema | §13 Database |
| Domain math (money, ranking, queue generation) | §14 Domain logic |

---

## 1. Stack

| Concern | Use | Notes |
|---|---|---|
| Runtime | Node 24 via nvm, pnpm 11 | Prefix every Node command with `nvm use &&` |
| Monorepo | Turborepo + pnpm workspaces | |
| Framework | Next.js 16 App Router, React 19.2 | §9 |
| Language | TypeScript 5, `strict` | No `any` (Biome errors on it) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) | shadcn for behaviour; visuals from the prototypes |
| Server/mock data | TanStack Query v5 | |
| Global client state | Redux Toolkit | Auth + UI chrome only |
| Forms | React Hook Form + Zod | §6 |
| Tables | TanStack Table v8 | §12 |
| Animation | Motion (`motion/react`) | §11 |
| Lint/format | Biome | `next lint` no longer exists in Next 16 |
| Components | Storybook (one, in `@rotra/ui`) | §5 |

**Adding any other dependency needs a decision.** Ask before adding one, say why, and add it to this table.

---

## 2. Naming and imports

| Item | Convention | Example |
|---|---|---|
| Component / form folder | `kebab-case` | `match-card/`, `session-setup-form/` |
| Files in a component folder | `PascalCase` + dotted suffix | `MatchCard.tsx`, `MatchCard.meta.ts` |
| Props type | `<Name>Props`, declared in the `.tsx` above the component | `MatchCardProps` |
| Hooks | `use` + PascalCase, camelCase file | `useQueueSession` in `useQueueSession.ts` |
| Redux slice | `<feature>Slice.ts` | `authSlice.ts` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_COURTS` |
| Types / interfaces | `PascalCase`, entity names from [product terms §12](product-terms.md#12-term--code-identifier) | `QueueSession`, `SessionPlayer` |
| Enum-like unions | String literal unions, lowercase values | `type SessionMode = 'chill' \| 'fair' \| 'hard'` |
| Route segments | kebab-case, product words | `saved-players/`, `sessions/[sessionId]/` |
| Domain words in code and copy | Exactly as in [product-terms.md](product-terms.md) | `queue`, never `que` |

**Imports**

- **No barrel files** (`index.ts` re-exports) anywhere: not in apps, not in packages.
- Packages expose each component or module through a `package.json` `exports` subpath:
  `import { MatchCard } from '@rotra/ui/match-card'`.
- Inside an app, import with the `@/` alias for `src/`: `import { SessionConsole } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'`.
- Components use named exports. Next.js route files (`page.tsx`, `layout.tsx`, …) use the default export Next requires.

---

## 3. Components

Every visual component lives in `@rotra/ui`, each in its own folder:

```text
packages/ui/src/components/match-card/
├── MatchCard.tsx            required: component + MatchCardProps
├── MatchCard.stories.tsx    required: §5
├── MatchCard.meta.ts        required: §4
├── MatchCard.variants.ts    when it has cva variants
├── MatchCard.helpers.ts     only with 3 or more pure helpers (1–2 stay inline in the .tsx)
└── MatchCard.types.ts       only for non-prop types shared between these files
```

Rules:

- **Match the prototype.** Each component is built from a named prototype screen and must look and
  behave like it in both themes: spacing, type, radius, states, copy. The prototype is the visual spec,
  and the `.meta.ts` names which screen it came from. Don't "improve" a design in a component ticket.
- Functional components only. Pass `ref` as a normal prop (React 19); `forwardRef` is not needed.
- Use a shadcn/ui primitive when one exists (Dialog, Sheet, Tabs, Select, Switch, …). Scaffold it, move
  it into its kebab folder, then restyle with ROTRA tokens. shadcn compounds (`Dialog` + `DialogContent`
  + …) keep all their parts as named exports in the one `.tsx`.
- Custom compounds that expose sub-parts put each part in a nested kebab folder with its own three files.
- Variants use `cva` in `<Name>.variants.ts`, exporting `matchCardVariants` (recipe) and
  `MatchCardVariants` (type). No inline `cva`.
- Merge classes with `cn` from `@rotra/ui/cn`.
- Components receive data through props and report through callbacks (`onStart`, `onSelectPlayer`).
  They never fetch, route, or touch Redux.
- Every interactive element has an accessible name. Dialogs and sheets trap focus, close on Escape,
  and return focus to the trigger ([experience contract](screens/product/experience-contract.md#accessibility-and-interaction)).
- Helpers are pure functions: no hooks, DOM, storage, or network.

**App `_components/` follow the same folder layout** (`<Name>.tsx` + `<Name>.meta.ts`, no stories),
but only wire data to `@rotra/ui` components. If a container needs its own visual markup, that markup
is a missing `@rotra/ui` component: create it.

---

## 4. Meta files

Every component, form, and app container has `<Name>.meta.ts`. It describes the component for people and
agents, so nobody has to read the implementation to know when to use it.

```ts
import type { ComponentMeta } from '@rotra/ui/meta'

export const matchCardMeta = {
  name: 'MatchCard',
  description: 'One waiting or active match in the shared queue: number, teams, levels, and its start state.',
  usage: [
    'Use for every match in the waiting queue and on a court.',
    'Do not use for finished matches. Use MatchRecordRow instead.',
  ],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Live console › Queue tab' },
  docs: ['docs/screens/product/modules/queue/match-queue.md'],
  variants: ['waiting', 'ready', 'blocked', 'needs-attention', 'active'],
  related: ['PlayerChip', 'CourtCard'],
} satisfies ComponentMeta
```

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Component name, same as the file |
| `description` | yes | One or two sentences, using [product terms](product-terms.md) |
| `usage` | yes | When to use it, and when to use something else |
| `prototype` | yes for `@rotra/ui` | Prototype file and screen it must match |
| `docs` | when one exists | Screen or business doc paths with the rules it shows |
| `variants` | when it has variants | Variant names, same as the `cva` keys |
| `related` | no | Components often used with it, or easily confused with it |

Update the meta file in the same PR as any change to the component's purpose or variants.

---

## 5. Storybook

One Storybook lives in `@rotra/ui`. Apps have none.

- Every component and form ships `<Name>.stories.tsx`.
- Stories cover the default state, **each variant**, and the states the screen docs require: loading,
  empty, error, disabled, offline, long names and IDs.
- Every story renders in **both themes** through the theme toolbar. Check both before opening a PR.
- Story data comes from `@rotra/data/fixtures/`, never inline objects, so stories and the mock store
  show the same players and sessions.
- Title stories by product area: `Queue/MatchCard`, `Shared/Button`, `Admin/LicenseForm`.
- Phone stories use a 375 px viewport; desktop stories use 1280 px.

---

## 6. Forms

A form is a component, so it lives in `@rotra/ui` with two extra files:

```text
packages/ui/src/forms/session-setup-form/
├── SessionSetupForm.tsx
├── SessionSetupForm.stories.tsx
├── SessionSetupForm.meta.ts
├── SessionSetupForm.defaultValues.ts   typed initial values (also used for reset)
└── SessionSetupForm.schema.ts          Zod schema + inferred types, built from @rotra/schema fields
```

- React Hook Form with `zodResolver`. Use `FormProvider` + `Controller` with the `@rotra/ui` field
  components. No `register`-style wiring for primary fields.
- The `FormProvider` stays inside the form component, never in the parent.
- **Forms do not mutate.** A form takes `onSubmit(values)`, `isPending`, and an optional `serverError`,
  and disables submit while pending so one tap can't submit twice. The app's `_components` container
  owns `useMutation`, invalidation, and the success **and** failure toasts.
- Field errors sit next to their field; several failures add a summary. Never clear what the user typed
  after a retryable failure.
- Optional fields stay optional (scores, social links, every financial field). Don't make them required.
- If a needed field component does not exist yet, build it in `@rotra/ui` first (component tickets
  come first in every epic). Do not drop in a raw `<input>`.

---

## 7. Shared schemas — `@rotra/schema`

Field rules used by more than one form live once in `@rotra/schema`, one field family per file:

```text
packages/schema/src/
├── email.ts      emailField
├── phone.ts      phoneField   (PH mobile, grouped as typed, normalized to E.164 on parse)
├── date.ts       dateField, dateRangeField, timeField
├── money.ts      moneyField   (centavos as an integer, never a float)
└── password.ts   passwordField
```

- A form's `.schema.ts` composes them: `z.object({ email: emailField, phone: phoneField.optional() })`.
- A rule moves into `@rotra/schema` as soon as a **second** form needs it. Never copy a field rule.
- Each export has a JSDoc line saying what it accepts and how it normalizes.
- `@rotra/data` uses the same schemas to validate mock inputs, and route handlers will use them later.

---

## 8. Styling

- **Tokens only.** No hex, `rgb()`, or arbitrary color values (`bg-[#0f0]`) in components. Use the token
  utilities from `@rotra/config`. If a needed color is missing, add a token (both themes) first.
- **Both themes ship.** Dark is the default; light is `[data-theme="light"]`. The light accent is a deeper
  green that passes WCAG AA; never reuse the dark-mode green on light backgrounds.
- **Touch sizing** on touch screens or windows ≤ 1024 px: buttons 48 px tall, small buttons 44 px, icon
  buttons ≥ 44 × 44 px, tabs 48 px, Present switches 54 × 32 px
  ([experience contract](screens/product/experience-contract.md#layout-and-device-behavior)).
  Desktop with a mouse keeps compact sizes.
- **Phones (~375 px): nothing scrolls sideways.** Tables become labelled cards; action rows become a
  two-column grid.
- Never rely on colour alone for a state; pair it with text or an icon.

---

## 9. Next.js 16

| Rule | Detail |
|---|---|
| Async request APIs | `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are async only. Always `await` them |
| Typed route props | Use the generated helpers: `export default async function Page(props: PageProps<'/sessions/[sessionId]'>)`; run `next typegen` if missing |
| Route guard | `src/proxy.ts` exporting `proxy()`. **Never create `middleware.ts`.** Proxy runs on Node, not Edge |
| Private folders | Route-specific containers go in that route's `_components/`, which routing ignores |
| Parallel routes | Every `@slot` needs a `default.tsx` or the build fails |
| Bundler | Turbopack is the default for `next dev` and `next build`; no `--turbopack` flag, no custom webpack |
| Linting | Biome. `next lint` and the `eslint` key in `next.config` are gone |
| `'use client'` | Only on `_components` containers and interactive `@rotra/ui` leaves. Pages and layouts stay server components |
| Server Actions | Don't add one. Writes go through route handlers (see architecture §5) |
| Caching | `cacheComponents` and the React Compiler stay **off** during the mock phase |
| Images | `next/image` with `images.remotePatterns` (not `domains`) |
| Env | `NEXT_PUBLIC_*` for client values; `serverRuntimeConfig` / `publicRuntimeConfig` no longer exist |
| Version-matched docs | Next ships its docs in `node_modules/next/dist/docs/`. Read them over memory when unsure |

A page stays thin:

```tsx
// app/(operator)/sessions/[sessionId]/page.tsx
import { SessionConsole } from './_components/session-console/SessionConsole'

export default async function SessionPage(props: PageProps<'/sessions/[sessionId]'>) {
  const { sessionId } = await props.params
  return <SessionConsole sessionId={sessionId} />
}
```

---

## 10. Data and state

**`@rotra/data`**, one folder per domain (`queue-session`, `match`, `club-player`, `player`, `club`, `license`, …):

```text
packages/data/src/
├── fixtures/                     Sample data from the prototypes; shared with Storybook
├── mock/                         In-memory store, fake latency, dev toggles
└── queue-session/
    ├── queueSession.types.ts     QueueSession, SessionMode, …
    ├── queryKeys.ts              queueSessionKeys.detail(id), queueSessionKeys.list(clubId)
    ├── fetchers.ts               getQueueSession(id), startSession(input): the swap point
    ├── useQueueSession.ts        query hook
    └── useStartSession.ts        mutation hook; invalidates the right keys
```

- Components and containers never call `fetch` or the mock store directly, only hooks.
- Query keys come from each domain's factory; never write a key array by hand in an app.
- Mutations invalidate (or update) affected keys in the hook, so every screen stays consistent.
- The mock store keeps prototype behavior: same fixtures, same rules (e.g. one active session per club,
  permanent results), short fake delays, and dev toggles for offline and failures.
- Mock code never ships as a product feature. Dev toggles are excluded from production builds.

**Redux Toolkit** holds only the signed-in account, UI chrome (nav collapsed), and dev toggles.

- Slices in `apps/<app>/src/store/slices/<feature>Slice.ts`, typed state, selectors in the slice file.
- No async thunks; async work belongs to TanStack Query.
- Never copy query data into Redux.

**Local state** (`useState`) for anything one component owns: an open sheet, a draft lineup, a tab.

---

## 11. Motion

- Import from `motion/react`. Keep animation inside `@rotra/ui` components, not in pages or containers.
- Use the durations and easing from the prototypes. Sheets, toasts, and court changes should feel
  the same as the prototype.
- Every animation respects reduced motion (`useReducedMotion`, or a static fallback). Pulses and embers
  stop entirely.
- Don't use React's `<ViewTransition>` unless route transitions are decided.

---

## 12. Tables

- Build tables with TanStack Table through the shared `@rotra/ui/data-table` component.
- Column definitions live next to the container that uses them (`_components/<name>/<Name>.columns.tsx`).
- At phone width, every table renders as one labelled card per row.

---

## 13. Database (later epic)

- One `.prisma` file per entity group, in product folders (`admin/`, `queue/`, `player/`), with only the
  generator and datasource in `base.prisma`. **Never one big `schema.prisma`.** See [architecture §10](architecture.md#10-database-later-epic).
- Models are singular PascalCase mapped to plural snake_case tables (`model QueueSession` +
  `@@map("queue_sessions")`); fields are camelCase mapped to snake_case (`@map("club_id")`).
- Enums live in the file of the entity that owns them.
- Follow [database conventions](database_design/product/conventions.md): UUID keys, `club_id` on every club
  record with composite scoped FKs, `created_at` / `updated_at` / `revision`, money as integer centavos +
  currency, optional values as `null` (not 0).
- Migrations are irreversible in practice. Every migration needs a human sign-off.

---

## 14. Domain logic

- Rules such as break-even, calculated minimum, queue generation, standings, and rank are **pure
  functions** in `@rotra/data/<domain>/<domain>.rules.ts`, used by the mock store now and by the server later.
- Never improvise a formula. If the business docs mark it open ([open decisions](business_logic/product/open-decisions.md)),
  copy the prototype's reference behavior, label it as such in a comment, and keep it in one function.
- **Money and ranking math need unit tests** (the one place tests are required). Ask before adding tests
  anywhere else.

---

## 15. Comments and copy

- Comment *why*, not *what*. A comment that repeats the code gets removed in review.
- UI copy comes from the prototype and the screen docs. Don't reword confirmations; the dialog copy in
  [dialogs.md](screens/product/dialogs.md) is deliberate.
- Sync and save states use the exact labels in [product terms §8](product-terms.md#8-offline-and-sync).
