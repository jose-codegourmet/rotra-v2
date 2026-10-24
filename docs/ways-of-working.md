# Ways of Working — ROTRA

> How work gets proposed, built, verified, and merged in this repo — by humans and AI agents alike.
> Root `AGENTS.md` tells an agent *what is true*. This file tells it *how to behave*.

**Audience:** contributors and AI coding agents. **Read alongside:** root `AGENTS.md`.

---

## 1. Core stance

Three facts shape every process decision here:

1. **There are almost no automated tests, by decision.** Broad unit testing is deliberately
   deferred while behavior is still moving (§6.1). CI runs Biome lint and `pnpm type-check`. Every
   safety net in this repo is a human eye, a type, or a manual check.
2. **The schema and specs run ahead of the UI.** 36 OpenSpec domains, 36 Prisma models, and a large
   surface of screens that render mock constants. "It exists in the repo" and "it works" are
   different claims.
3. **Documentation drifts.** Parts of `docs/techstack/` describe an architecture the repo moved
   away from. Trusting docs blindly produces wrong code.

Everything below exists to compensate for those three facts.

---

## 2. The work loop

```
explore → propose → review → apply → verify → sync/archive
```

| Stage | Tool | Rule |
|-------|------|------|
| **Explore** | `opsx-explore` | Think and read only. **No file edits.** Output is understanding. |
| **Propose** | `opsx-propose` | Produces `proposal.md`, delta specs, `design.md`, `tasks.md`. **Never implements in the same turn.** |
| **Review** | human | A human reads the proposal before any code is written. This is the cheapest place to catch a wrong idea. |
| **Apply** | `opsx-apply` | Implements the tasks in the change. Scope is the task list — nothing else. |
| **Verify** | human + agent | See §6. Nothing merges unverified. |
| **Sync / Archive** | `opsx-sync` / `opsx-archive` | Fold delta specs into `openspec/specs/`; archive the completed change. |

`opsx-update` revises planning artifacts and **never edits code**.

**Why the split matters:** propose-then-apply is the only review gate this repo has before code
lands. Collapsing them into one turn removes it.

---

## 3. Sizing work

| Size | Shape | Process |
|------|-------|---------|
| **Trivial** | typo, copy, token swap, lint fix | Direct commit. No spec. |
| **Small** | one component, one route handler, one hook — no behavior change | Direct PR. Note the affected spec if any. |
| **Medium** | new screen, new API surface, mock→real promotion | Full OpenSpec change. Propose first. |
| **Large** | new domain, schema migration, cross-app change | OpenSpec change + `design.md` + explicit human sign-off before apply. |

**Migrations are always Large.** There are 15 migrations in this repo and no rollback tooling.
Treat every schema change as irreversible in practice.

---

## 4. Branching and commits

- Branch from `main`. Name it `<type>/<short-kebab-description>` using Conventional Commit types:
  `feat/session-cost-settlement`, `fix/onboarding-redirect`, `chore/biome-config`.
- **Conventional Commits are enforced** by commitlint on `commit-msg`. `feat:`, `fix:`, `chore:`,
  `docs:`, `refactor:`, `style:`, `perf:`, `build:`, `ci:`, `revert:`.
- Scope with the package when it helps: `feat(client): add session console roster panel`.
- Keep commits reviewable. A 40-file "implement queue" commit cannot be reviewed and will not be.
- Hooks you will hit: `pre-commit` runs `pnpm lint`; `pre-push` runs `pnpm lint && pnpm build`.
  A slow push is the build hook doing its job — do not bypass with `--no-verify`.

**AI-authored commits** get a trailer so the history stays honest:

```
feat(admin): persist kill switch toggles

Co-Authored-By: <agent name/model>
```

---

## 5. Definition of Ready / Definition of Done

### Ready to start

- [ ] The matching `openspec/specs/<domain>/spec.md` has been read
- [ ] Current implementation status is known — real, mock, or absent
- [ ] Domain terms in the task use canonical spelling
- [ ] The write path is decided (route handler + service, not a Server Action)
- [ ] For a mock→real promotion: the target behavior is described in a spec, not invented

### Done

- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes — CI runs this on PRs after `pnpm db:generate`
- [ ] `pnpm build` passes for every app touched
- [ ] Stories exist for new/changed components, fixtures pulled from `app/constants/`
- [ ] Forms: `Form` + `Controller`, colocated `schema.ts` + `default.ts`, disabled-while-pending,
      toast on success **and** failure
- [ ] No leftover `MOCK_*` on the shipping path; no leftover `console.log`
- [ ] No barrel file, no hardcoded hex, no light-mode styles, no new Server Action
- [ ] OpenSpec updated (or a change proposed) if behavior moved
- [ ] PR body lists **what was manually verified**, step by step

---

## 6. Verification and testing posture

This is the most important section in this document. With no test suite, "it compiles" is the
weakest possible evidence — and it is the only evidence CI provides.

### 6.1 What we test, and what we deliberately don't

Testing is scoped by **cost per bug caught**, not by coverage percentage. Two separate concerns:
OpenSpec constrains *what gets generated*; verification constrains *what gets accepted*. Specs do
not substitute for verification — nothing executes a spec, which is exactly how `docs/techstack/`
came to describe an architecture the repo abandoned.

| Layer | Policy | Rationale |
|-------|--------|-----------|
| **`pnpm type-check` in CI** | **Required** | The types are already written. Not enforcing them is free signal thrown away. Highest ROI item in this table. |
| **Pure domain math** — cost formula, MMR deltas, calibration multiplier, EXP asymmetry, void reversals | **Required** | Pure functions, exact documented formulas, irreversible when wrong. A corrupted ladder is invisible for weeks. ~10–20 tests total. |
| **Route handler smoke checks** | **At mock→real promotion only** | ~10 lines: does it return the expected shape and persist. Not retroactive. |
| **Component unit tests** | **Deferred** | Most components render `MOCK_*` fixtures. Testing a fixture tests nothing. |
| **E2E / integration** | **Deferred** | Flows are still changing shape. Revisit when the `MOCK_` count trends to zero. |

The reason to defer is **maintenance against churning behavior**, not authoring effort — agents
write tests cheaply now. Do not test behavior that is still under active product debate (e.g. the
Quick Session create conflict in `AGENTS.md` §7). Settle the spec first.

**Trigger to revisit:** when `scripts/refresh-context.sh` reports the `MOCK_` file count near zero,
behavior has stopped moving and broader tests start holding their value.

**Agents:** do not add test files or a test runner outside the Required rows above without asking.
An unsolicited vitest setup is scope creep.

CI job in `.github/workflows/biome.yml` (alongside the Biome lint matrix):

```yaml
# .github/workflows/biome.yml — type-check job alongside the lint matrix
type-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version-file: '.nvmrc', cache: 'pnpm' }
    - run: pnpm install --frozen-lockfile
    - run: pnpm db:generate
    - run: pnpm type-check
```

### 6.2 The verification block

Because coverage is intentionally thin, **every PR must include a verification block:**

```md
## Verified
- Ran `pnpm --filter @rotra/client dev`, logged in via Facebook OAuth
- Created a Club Que Session (type: MMR) from /dashboard → appeared in /find-sessions
- Confirmed POST /api/sessions/quick returned 201 and the row exists (pnpm db:studio)
- Reloaded the page — state persisted (not local component state)
- Checked mobile viewport at 390px — no overflow

## Not verified
- Cost settlement path (no session with payments in local data)
```

**Minimum bar by change type:**

| Change | Minimum verification |
|--------|----------------------|
| UI-only | Render in dev, check dark tokens, check 390px + 1280px, check 44×44px touch targets |
| Route handler | Call it (curl or the UI), confirm the DB row via `pnpm db:studio` |
| `@rotra/db` service | Exercise through the route, confirm returned DTO shape |
| Schema/migration | `db:migrate` locally, `db:generate`, `pnpm build`, confirm no drift on `db:push` |
| Auth/middleware | Test logged-out, logged-in, and wrong-role paths — all three |
| Mock→real promotion | Reload the page and confirm state survives. This is the whole point. |

**"Not verified" is a legitimate entry.** Stating a gap honestly is far more useful than an
implied guarantee. Agents especially: never write "tested and working" when you ran a build.

---

## 7. Mock → real promotion checklist

The repo's biggest category of work. Follow this order every time:

1. **Read the spec.** `openspec/specs/<domain>/spec.md`. If it does not describe the behavior,
   stop and propose a change first.
2. **Inventory the mock.** Find every `MOCK_*` constant and every local toast the screen relies on.
3. **Confirm the schema supports it.** Most domains already have models. Check before adding one —
   the schema is ahead of the UI, not behind it.
4. **Write the service** in `packages/db/src/<feature>-service.ts`. Domain logic lives here.
5. **Write the route handler** in `app/api/<feature>/route.ts`. Auth check first, then the service.
6. **Write the fetch helper + query key** in `lib/api/`.
7. **Swap the component** from the mock constant to the hook. Handle loading, empty, and error —
   mock screens never have these three states and they are always missed.
8. **Move the mock into `app/constants/`** as a Storybook fixture. Do not delete it — stories need
   it. Do not leave it imported by the runtime component.
9. **Verify persistence by reloading the page.** If state survives a refresh, it is real.
10. **Update `.agents/context/implementation-status.md`** — move the row from mock to real.
11. **Sync the OpenSpec** so it now describes shipped behavior.

Step 10 is skipped constantly and it is what keeps the context files trustworthy.

---

## 8. Handling drift

When code and docs disagree:

1. Check `.agents/context/known-drift.md` — the contradiction may already be catalogued. The
   **Reality** column wins, always.
2. If it is new drift, **do not silently follow either side.** Add a row to the drift file in the
   same PR.
3. If the drift is a doc that is simply wrong and cheap to fix, fix the doc in the same PR.
4. If the drift represents a genuine product question ("should Quick Session create be allowed for
   players?"), that is a **spec change**, not a code fix. Propose it.

**Never** resolve drift by changing working code to match a stale document.

---

## 9. Reviewing AI-authored changes

AI changes fail differently from human changes. Review in this order:

1. **Invented surface** — does it call an API, field, or component that does not exist? This is the
   single most common failure. Grep every new import and endpoint.
2. **Vocabulary** — "Queue Master", "leave a review", "Unscored", lowercase "rotra". Instant reject.
3. **Pattern drift** — a Server Action, a barrel file, a hardcoded `#00FF88`, an async thunk, a
   `register`-style form. These mean the agent followed stale docs instead of neighboring code.
4. **Fabricated confidence** — a PR claiming behavior works when only a build was run. Check the
   verification block against what was plausibly executed.
5. **Scope creep** — files touched that no task in the change asked for.
6. **Then** review the logic normally.

Reviewers: it is faster to reject with "read `.agents/context/forms.md` and redo" than to fix an
agent's pattern violations by hand.

---

## 10. Documentation hygiene

| File | Update when | Owner |
|------|-------------|-------|
| Root `AGENTS.md` | Non-negotiables, architecture, or routing changes | Whoever changes it |
| `.agents/context/implementation-status.md` | **Every mock→real promotion or new real surface** | The implementing PR |
| `.agents/context/known-drift.md` | Any new doc-vs-code contradiction found | The PR that found it |
| `openspec/specs/<domain>/` | Behavior ships or changes | `opsx-sync` at end of change |
| `docs/business_logic/` | Product intent changes — **not** implementation | Product owner |
| `docs/REPO_SUMMARY.md` | Quarterly, or after a structural change | Scheduled re-audit |

**Rule of thumb:** if a PR changes what is true about the system, the PR updates the file that
claims it. Docs updated in a separate follow-up PR do not happen.

Stamp `Last verified: YYYY-MM-DD` at the top of every context file and update it when you confirm
its contents — even if nothing changed. A stale-but-verified file is trustworthy; an undated one
is not.

---

## 11. Cadence

| Rhythm | Activity |
|--------|----------|
| **Every PR** | Lint, type-check, build, manual verification block, status file updated |
| **Weekly** | Skim open OpenSpec changes; archive anything finished and merged |
| **Monthly** | Re-verify `implementation-status.md` and `known-drift.md` against the tree |
| **Quarterly** | Regenerate `docs/REPO_SUMMARY.md` counts; prune dead weight (`.next/` at root, `storybook-static/`, orphaned design notes) |

---

## 12. Anti-patterns

Seen in this repo or likely given its shape. Each one has cost someone an afternoon.

- **Trusting a polished screen.** `/sessions/queue` looks production-ready and stores nothing.
- **Following `docs/techstack/` verbatim.** It describes `components/shadcn/`, Server Actions, and
  `next-pwa`. None of those exist here.
- **Adding a Server Action** because a doc said so. One exists, deliberately.
- **Adding a Realtime channel** for queue updates. Queue updates are refetches, by design.
- **Reaching for Redux** for a dropdown's open state.
- **Inline fixtures in stories** instead of `app/constants/`.
- **Writing business logic client-side.** Cost math, MMR deltas, and EXP live on the server.
- **`--no-verify`** to skip a slow pre-push build. The build hook is one of two real gates.
- **Reading `docs/REPO_SUMMARY.md` in full for a one-line fix.** Start at `AGENTS.md` instead. That is ~14k tokens for a typo.
- **Claiming a `docs/business_logic` rule ships** because it is written down convincingly.

---

## 13. Escalate, don't improvise

Stop and ask a human when the change touches:

- **Money** — cost formula, markup, settlement, payment status transitions
- **Ranking math** — MMR deltas, calibration multipliers, EXP asymmetry, void reversals
- **Auth or roles** — middleware, role grants, admin privilege, Quick Umpire tokens
- **Irreversible data** — migrations, deletions, retention
- **Anything with no spec** — absence of a spec is a signal to propose one, not to invent

The cost of asking is one message. The cost of improvising ranking math is a corrupted ladder that
nobody notices for a month.
