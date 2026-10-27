# Ways of working — ROTRA v1

**Last verified:** 2026-10-27 · **Audience:** contributors and AI coding agents.
[AGENTS.md](../AGENTS.md) says where to look. This file says how work is planned, built, checked, and merged.

**Read this when** you pick up a ticket, write tickets, open a PR, review a change, or find two docs
that disagree.

---

## 1. Core stance

1. **Docs first, then components, then screens.** Product, screen, and database docs are written
   before code. Code follows them; it doesn't decide product behavior.
2. **The prototypes are the design.** `docs/frames/*/*.html` are the agreed look and behavior. Build
   to match them, not to improve them.
3. **Mock first.** Screens run on `@rotra/data` mocks until the database epic. A finished-looking
   screen still stores nothing; say so.
4. **Almost no automated tests, by decision.** Lint and type-check are the only automatic gates.
   Manual verification (§7) is what keeps quality up, so state honestly what you checked.

---

## 2. Which source wins

When sources disagree:

| Question | Wins | Then |
|---|---|---|
| What does the product do? | [Business logic](business_logic/product/README.md) | Screen docs, then the prototype |
| What does it look like, what does the copy say? | The prototype for that app | [Screen docs](screens/product/README.md) |
| What's still undecided? | The `open-decisions.md` files | **Ask.** Never fill the gap yourself |
| What is a word called? | [product-terms.md](product-terms.md) | |
| How is it built and where does it go? | [architecture.md](architecture.md), [coding-conventions.md](coding-conventions.md) | Neighboring code once it exists |
| What tables and fields? | [Database design](database_design/product/README.md) | |
| What actually runs? | The code on `main` | Nothing else proves a feature is built |

The latest explicit decision from the product owner (in a ticket or PR) beats every document. Record it
in the matching doc in the same PR: the "Settled by the prototype" tables in `open-decisions.md` are the
pattern.

---

## 3. How work is organised

```text
Product (Queue · Player Information · Admin)
└── Epic = one module           e.g. Queue › Sessions, Player › Ranking, Foundation › Mock data layer
    └── Ticket = one PR-sized piece
```

**On GitHub** (`jose-codegourmet/rotra-v2`, a **public** repo):

- An epic is an issue labeled `epic` plus its product label (`foundation`, `queue`, `player`, `admin`).
- Tickets are the epic's **sub-issues**, so progress shows on the epic.
- Issues are public the moment they exist. New epics need the product owner's go-ahead before they
  are created.

### Epic order

1. **Foundation:** agent docs, monorepo scaffold, design tokens + themes, Storybook, base components,
   `@rotra/schema`, `@rotra/data` mock layer, Git hooks + CI.
2. **Queue** modules (the main v1 product), then **Player Information**, then **Admin**.
3. **Later:** Database (Prisma + Supabase), real Auth, offline sync engine, deployment.

### Ticket order inside every epic

Always in this sequence, because each step depends on the one before:

| # | Ticket type | Done means |
|---|---|---|
| 1 | **Components + Storybook** | Every `@rotra/ui` component the module needs, with `.stories.tsx` in both themes and `.meta.ts` |
| 2 | **Mock data** | Types, fixtures, mock store behavior, query keys, hooks for the module |
| 3 | **Screens** | Routes and `_components` containers that wire hooks to components |
| 4 | **States and dialogs** | Loading, empty, error, offline, and permission states plus `D-` dialogs, checked against [state-matrix.md](screens/product/state-matrix.md) and [dialogs.md](screens/product/dialogs.md) |

### Ticket template

```md
**Epic:** #<n> · **Type:** component | mock-data | screen | states · **Product:** queue

## Context
- Rule: docs/business_logic/product/queue/modules/<module>/README.md#<section>
- Screen: <Q-/P-/A- ID> in docs/screens/product/modules/<product>/<file>.md
- Prototype: docs/frames/<app>/<file>.html › <screen / tab>

## Scope
- …

## Out of scope
- …

## Acceptance criteria
- [ ] Matches the prototype in dark and light at 375 px and 1280 px
- [ ] …

## Verification
How a reviewer checks it (story names, route, steps).

**Depends on:** #<n>
```

Title format on GitHub: `<seq> · <key> · <Type>: <what>`, e.g. `042 · Q04.1 · Component: CourtCard, MatchCard`.
`<seq>` is the global build order (001, 002, …); `<key>` is epic + position (`Q04.1` = Queue epic 4, ticket 1).
Epics are titled `Epic <key> · <Product> › <Module>`.

### Picking up the next ticket (agents)

1. List open tickets: `gh issue list --label ticket --state open --limit 300 --json number,title`.
2. Take the open ticket with the **lowest `<seq>`** whose **Depends on** issues are all closed. Never skip
   ahead while an earlier ticket is still open, unless that earlier ticket is labeled `blocked`.
3. Comment `Picking this up.` on the issue, then branch, build, and verify (§5–7).
4. If the ticket can't be done as written (missing decision, wrong path, contradiction), comment what is
   wrong, add the `blocked` label, and move to the next ticket. Don't guess.
5. One ticket = one PR. When the PR merges, `Closes #<n>` closes the ticket and the epic's progress updates.

---

## 4. Definition of Ready

- [ ] The ticket links the business rule, the screen ID, and the prototype screen
- [ ] Nothing it needs is listed as open in an `open-decisions.md` (or the decision is in the ticket)
- [ ] The tickets it depends on are merged
- [ ] Terms in the ticket match [product-terms.md](product-terms.md)

---

## 5. Branches, commits, PRs

- Branch from `main`: `<type>/<issue#>-<short-kebab>`, e.g. `feat/42-court-card`.
- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `style:`, `perf:`,
  `build:`, `ci:`, `revert:`. Scope with the package when it helps: `feat(ui): add CourtCard`.
- One ticket per PR. The PR body says `Closes #<n>` and includes the verification block (§7).
- AI-authored commits end with a `Co-Authored-By:` trailer naming the agent.
- Hooks (set up by Foundation): `pre-commit` runs lint, `commit-msg` runs commitlint. Do not bypass
  them with `--no-verify`.

### Auto-merge: pipelines never block

PRs merge themselves. There is no branch protection and no required check; CI is advisory.

```bash
gh pr create --base main --title "<conventional title>" --body-file <body.md>   # body has Closes #<n> + Verified block
gh pr merge --squash --auto --delete-branch
```

- Run `nvm use && pnpm lint && pnpm type-check && pnpm build` **locally before** opening the PR. Auto-merge
  trusts you; it doesn't check for you.
- Then switch back to `main` and `git pull` before starting the next ticket.
- If `main` is broken after a merge (build or CI red), fixing it comes before the next ticket: open a
  `fix:` PR that references the ticket that broke it.
- The product owner reviews what landed on `main` afterwards, not before merge.

---

## 6. Definition of Done

- [ ] `nvm use && pnpm lint` and `nvm use && pnpm type-check` pass
- [ ] `nvm use && pnpm build` passes for every app or package touched
- [ ] Components: folder layout, `.meta.ts`, and stories in both themes ([coding conventions §3–5](coding-conventions.md#3-components))
- [ ] Forms: five files, shared fields from `@rotra/schema`, no mutation inside the form
- [ ] Matches the prototype side by side, dark and light, at 375 px and 1280 px
- [ ] No hex colors, barrels, Server Actions, `middleware.ts`, Realtime channels, or new dependencies
      without a decision
- [ ] Docs updated in the same PR if the change makes any doc untrue (§9)
- [ ] The PR's verification block says what was checked and what was not

---

## 7. Verification

With no test suite, "it builds" proves very little. Every PR has:

```md
## Verified
- Storybook: Queue/CourtCard, all variants, dark + light, 375 px + 1280 px
- Compared with rotra-queue.html › Live console › Courts: spacing, chips, copy match
- Keyboard: Tab reaches Start; Escape closes the sheet; focus returns to the trigger
- Reduced motion: pulse stops

## Not verified
- Offline state (dev toggle not built yet)
```

| Change | Minimum check |
|---|---|
| Component | Every story, both themes, both widths, keyboard, reduced motion, side by side with the prototype |
| Form | Valid and invalid submit, pending disables submit, error keeps input, optional fields stay optional |
| Mock data | Hook returns fixture data; mutation updates every screen that shows it |
| Screen | Run the app, walk the prototype flow end to end, check loading/empty/error states |
| Touch UI | Target sizes from the experience contract at ≤ 1024 px |

**"Not verified" is a legitimate entry.** Never write "tested and working" when you only ran a build.

### Tests

| Layer | Policy |
|---|---|
| Lint + type-check + build | Run locally before every PR; CI repeats them as an advisory report |
| Money and ranking math (break-even, rank, awards) | Unit tests required |
| Everything else | Deferred. Ask before adding tests or a test runner |

---

## 8. Reviewing a change (AI-authored especially)

Check in this order:

1. **Invented surface:** a component, route, field, hook, or term that isn't in the docs.
2. **Design drift:** doesn't match the prototype; hardcoded colors; light theme broken.
3. **Vocabulary:** "Que", "void", "MMR", lowercase "rotra" in UI, any [not-v1 word](product-terms.md#14-words-that-mean-not-v1--stop-and-ask).
4. **Pattern drift:** barrel file, Server Action, `middleware.ts`, Redux holding query data, a form
   that mutates, a container with its own visual markup.
5. **Overclaiming:** the verification block claims more than could have been run.
6. **Scope creep:** files no ticket asked for.
7. Then the logic.

---

## 9. Keeping docs true

**If a PR makes a document untrue, the same PR fixes the document.** Follow-up doc PRs don't happen.

| File | Update when |
|---|---|
| `AGENTS.md` | Non-negotiables, routing, or structure change |
| `docs/architecture.md` | An app, package, dependency rule, or data flow changes |
| `docs/coding-conventions.md` | A convention is added or changed (including a new dependency) |
| `docs/product-terms.md` | A term, state name, or code identifier is added or renamed |
| `docs/business_logic/`, `docs/screens/`, `docs/database_design/` | The product owner decides a behavior. Move it from open to settled |
| `docs/frames/*` | The product owner saves a new prototype version |
| `<Name>.meta.ts` | A component's purpose or variants change |

Stamp `Last verified: YYYY-MM-DD` at the top of a doc when you confirm it, even if nothing changed.

---

## 10. Stop and ask

Ask the product owner instead of guessing when the work touches:

- **Anything open** in an `open-decisions.md`
- **Money:** cost estimate, break-even, license prices
- **Ranking math:** rank formula, awards, eligibility windows
- **Permanent results:** anything that could edit a confirmed winner or invalid decision
- **Auth, privacy, or contacts:** who can see a phone or email
- **Irreversible data:** migrations, deletion, retention
- **A new dependency, package, app, Server Action, or Realtime channel**
- **Anything not in the docs**

Asking costs one message. A wrong guess in money or ranking math stays hidden until a club notices.
