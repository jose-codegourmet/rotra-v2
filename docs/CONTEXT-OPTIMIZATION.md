# Context Optimization Plan — ROTRA

> **Status: executed 2026-08-26.** This file is the design record. Live entry point is root
> `AGENTS.md`; on-demand slices live in `.agents/context/`. Where verification diverged from this
> plan (Realtime not built, Redux live-session wrong, light theme intentional, fetch helpers in
> hooks/, barrels as debt, refresh script writes `metrics.md` not `implementation-status.md`),
> trust `AGENTS.md` + `.agents/context/` over the prose below.

> Original brief: what was found in `REPO_SUMMARY.md`, and how to restructure agent context so runs
> are faster, cheaper, and stay accurate longer.

---

## 1. What I found

`REPO_SUMMARY.md` is 1,089 lines / 51.6 KB / **≈12,900 tokens**. As a single document it is
unusually good — honest about mocks, explicit about drift, correct authority ordering. The problem
is structural, not editorial.

**Four issues:**

1. **All-or-nothing loading.** The file opens with "an agent that reads only this file should be
   able to start work." That makes ~13k tokens the price of admission for a typo fix. In a 200k
   window that is ~6.5% of context spent before the agent sees a single line of code — and it is
   re-paid on every fresh session.

2. **Mixed volatility in one file.** Sections decay at wildly different rates:

   | Section | Size | Decays | Should live |
   |---------|------|--------|-------------|
   | §1 Product, §2 Domain language | ~3.6k tok | Yearly | Stable slice |
   | §3 Tech stack | ~1.3k tok | Per dependency bump | Stable-ish slice |
   | §5 Structure, §6 Principles | ~4.0k tok | Per convention change | Stable slice |
   | §4 Current state | ~1.8k tok | **Every merge** | Generated / per-PR file |
   | §7 Drift | ~0.4k tok | **Every fix** | Its own file, highest value per token |
   | §8 Appendices | ~1.1k tok | Mixed | Split by cadence |

   Bundling a per-merge section with a per-year section means the whole file goes stale at the rate
   of its fastest-moving part. The `Last verified: 2026-08-25` stamp covers all of it equally, which
   is a promise the file cannot keep.

3. **Highest-value content is buried lowest.** §7 (Doc vs code drift) is ~400 tokens and prevents
   more bad diffs than any other section — it is the list of places where following the docs
   produces wrong code. It sits at line 942. An agent that skims will miss it. It should be near
   the top and separately loadable.

4. **The repo has no agent entry point at all.** §6.11 states there is no `AGENTS.md`, no
   `CLAUDE.md`, no `.cursor/rules/*.mdc`. So `REPO_SUMMARY.md` is doing entry-point duty by
   convention only — nothing auto-loads it, and every agent has to be told to read it. Agent
   tooling looks for specific filenames; give it one.

**Also worth noting:** zero automated tests plus no type-check in CI means agents get almost no
feedback signal. Lint is the only automated gate. That is a context problem too — an agent that
can't verify will confidently assert. The `ways-of-working.md` verification block is the
compensating control, but adding `type-check` to CI is the cheapest real fix available.

---

## 2. The model: three tiers

| Tier | Loaded | Budget | Contents |
|------|--------|--------|----------|
| **T1 — Always** | Every session, automatically | **≤3k tok** | `AGENT.md`: non-negotiables, routing table, architecture, traps |
| **T2 — On demand** | When the routing table points there | 400–1,500 tok each | `.agents/context/*.md` — one concern per file |
| **T3 — Rare** | Deep audits, human onboarding | Unbounded | `REPO_SUMMARY.md`, `docs/`, `openspec/specs/` |

The `AGENT.md` I wrote is **244 lines / ~3.0k tokens** — a **77% cut** to the always-loaded tier.

**Expected per-task cost:**

| Task | Today | After |
|------|-------|-------|
| Typo / copy fix | ~12.9k | ~3.0k |
| New component | ~12.9k | ~3.0k + ~1.2k = 4.2k |
| New API route | ~12.9k | ~3.0k + ~1.4k = 4.4k |
| Mock→real promotion | ~12.9k | ~3.0k + ~2.6k = 5.6k |
| Deep architecture audit | ~12.9k | ~13k (unchanged — correctly) |

Typical saving is 55–75% on context load, and the win compounds: more free window means fewer
mid-task compactions, which is where agents lose the thread and start inventing.

**Prompt caching caveat:** if your tooling caches the system prompt, re-reading a stable 13k file is
cheap in dollars but *not* in context window. The window pressure is the real cost, and tiering is
what fixes it. Keep T1 stable so it caches well; keep churn in T2.

---

## 3. Proposed file tree

```
rotra-app/
├── AGENT.md                          ← T1. ~250 lines, hard cap. [created]
├── AGENTS.md                         ← symlink → AGENT.md (see §6)
├── CLAUDE.md                         ← symlink → AGENT.md
├── ways-of-working.md                ← process. Loaded for planning/PR work. [created]
├── REPO_SUMMARY.md                   ← T3. Demote to "deep reference / human onboarding"
│
├── .agents/
│   ├── context/
│   │   ├── glossary.md               ~900 tok   Terms + the 4 critical distinctions
│   │   ├── architecture.md           ~800 tok   Rendering, boundaries, realtime, Next 15 rules
│   │   ├── data-layer.md             ~700 tok   Write path, services, Prisma, RLS reality
│   │   ├── components.md             ~700 tok   Anatomy, naming, stories, shadcn exception
│   │   ├── forms.md                  ~600 tok   RHF+Zod+Controller MUSTs, audit skills
│   │   ├── design-tokens.md          ~500 tok   Dark-only palette, type scale, spacing, a11y
│   │   ├── state.md                  ~400 tok   Query vs Redux split, slice conventions
│   │   ├── known-drift.md            ~400 tok   Docs-lie table. HIGHEST value per token.
│   │   ├── implementation-status.md  ~1.5k tok  Real / mock / absent. Regenerated, not hand-written.
│   │   └── commands.md               ~400 tok   Scripts, ports, env vars, hooks, CI
│   └── skills/                       (existing)
│
├── apps/
│   ├── client/AGENT.md               ~60 lines  Client-specific: auth, routes, mock map
│   ├── admin/AGENT.md                ~50 lines  Admin-specific: OTP, service role, mock map
│   ├── umpire/AGENT.md               ~25 lines  "This is a stub. Specs exist. Nothing built."
│   └── landing/AGENT.md              ~25 lines  Static, waitlist, legal-content
│
├── packages/
│   ├── db/AGENT.md                   ~60 lines  Schema layout, service pattern, migration rules
│   └── config/AGENT.md               ~25 lines  Token source of truth
│
├── .claudeignore / .cursorignore     ← §7. Big grep-cost win.
└── scripts/refresh-context.sh        ← §5. Regenerates the volatile numbers.
```

Nested `AGENT.md` files matter more than they look: most agent tooling loads the nearest one when
working in a subdirectory. An agent editing `apps/umpire/` picks up "this is a stub" automatically
instead of hallucinating a scoring engine from the five umpire OpenSpecs.

---

## 4. File-by-file spec

### T2 context slices

| File | Source in summary | Purpose | Refresh |
|------|-------------------|---------|---------|
| `glossary.md` | §2.2, §2.4 | Every term + role + the four distinctions agents conflate | On product vocabulary change |
| `architecture.md` | §6.1, §6.2, §3.3, §3.4 | Rendering per app, server/client boundaries, Next 15 params rules, realtime scarcity | On architecture change |
| `data-layer.md` | §5.3, §5.4, §6.4, §4.5 | Canonical write path, `@rotra/db` services, model inventory, RLS reality | On schema/service change |
| `components.md` | §6.5, §6.6, §6.7 | Folder anatomy, naming, stories, no-barrels, shadcn compound exception | On convention change |
| `forms.md` | §6.8 | RHF `Form`+`Controller`, colocated schema/defaults, toast rules, the exact TODO comment string | Rarely |
| `design-tokens.md` | §6.9, §1 brand | Dark-only tokens, type scale, 4px grid, 44×44 targets, one CTA | On token change |
| `state.md` | §6.3 | Query vs Redux table, slice conventions, no-thunks | Rarely |
| `known-drift.md` | §7 | The docs-lie table | **Every time drift is found or fixed** |
| `implementation-status.md` | §4.2–§4.4, §4.6 | Real / mock / absent per route | **Every PR that changes it** |
| `commands.md` | §8.1–§8.3 | Commands, ports, env vars, hooks, CI coverage | On tooling change |

### Files to add that don't exist yet

| File | Why |
|------|-----|
| `.agents/context/verification-recipes.md` | With zero tests, "how do I check this works" is tribal knowledge. Write per-domain recipes: how to create a test session locally, how to reach an admin OTP login, how to seed a club. This is the single highest-leverage new doc given no test suite. |
| `docs/adr/NNNN-*.md` | Lightweight ADRs. "Route handlers over Server Actions", "Mapbox over Google Places", "no barrel files", "realtime limited to two cases" all currently live as assertions with no recorded reasoning. Agents follow rules better when the *why* is one line away, and ADRs stop settled decisions from being relitigated every quarter. |
| `.agents/context/spec-index.md` | A one-line-per-domain map of the 36 OpenSpecs with an implemented/partial/unbuilt flag, so an agent picks the right spec without opening several. |
| `CONTRIBUTING.md` | Human-facing; can be three lines pointing at `ways-of-working.md`. Conventional for outside readers and GitHub surfaces it automatically. |

### Files to consider retiring

| File | Action |
|------|--------|
| `SOLUTION_PLACES_CHATGPT.md` | Describes a Google Places approach never built; code uses Mapbox. Convert to `docs/adr/0002-mapbox-over-google-places.md` and delete the original. It currently reads as a plan. |
| `.next/` at repo root | Stale cache. Delete + gitignore. Pure noise in every file listing. |
| `apps/*/storybook-static/` | Build artifacts. Ignore from agent tooling. |
| `exported/`, `otf-web-fonts/` | Keep, but add to the ignore files — agents never need them and they pollute search. |

---

## 5. Keep it honest with a script

The volatile numbers in §4 (page counts, handler counts, story counts, commit counts, `'use server'`
files) should never be hand-maintained. They will be wrong within a week and a wrong context file is
worse than no context file — it produces confident wrong output.

```bash
#!/usr/bin/env bash
# scripts/refresh-context.sh — regenerate volatile counts
set -euo pipefail
out=".agents/context/implementation-status.md"

{
  echo "# Implementation Status"
  echo
  echo "> Auto-generated by scripts/refresh-context.sh. Counts are machine-derived;"
  echo "> the real/mock tables below are hand-maintained — update them in the same PR."
  echo
  echo "**Generated:** $(date +%F)"
  echo
  echo "| Metric | Value |"
  echo "|--------|-------|"
  for app in client admin landing umpire; do
    p=$(find "apps/$app/src/app" -name 'page.tsx' 2>/dev/null | wc -l | tr -d ' ')
    r=$(find "apps/$app/src/app" -name 'route.ts' 2>/dev/null | wc -l | tr -d ' ')
    echo "| $app pages / route handlers | $p / $r |"
  done
  echo "| Prisma models | $(grep -rhc '^model ' packages/db/prisma/*.prisma | paste -sd+ | bc) |"
  echo "| Migrations | $(ls -1 packages/db/prisma/migrations | grep -c '^2') |"
  echo "| OpenSpec domains | $(ls -1 openspec/specs | wc -l | tr -d ' ') |"
  echo "| \`'use server'\` files | $(grep -rl "use server" apps packages --include='*.ts*' | wc -l | tr -d ' ') |"
  echo "| Files containing MOCK_ | $(grep -rl 'MOCK_' apps --include='*.ts*' | wc -l | tr -d ' ') |"
  echo "| Test files | $(find apps packages -name '*.test.*' -o -name '*.spec.*' | wc -l | tr -d ' ') |"
  echo "| Commits (30d) | $(git log --since='30 days ago' --oneline | wc -l | tr -d ' ') |"
} > "$out"

echo "Wrote $out"
```

Wire it into a `chore:` commit monthly, or a scheduled CI job that opens a PR when the numbers move.
The `MOCK_` file count is the useful one — it is a direct measure of how much of the product is
still theatre, and it should trend to zero.

---

## 6. On the filename

Worth knowing before you commit to one:

- **`AGENTS.md`** (plural) is the emerging cross-tool convention — Codex, Cursor, Copilot, Zed,
  Jules and others look for it.
- **`CLAUDE.md`** is what Claude Code has historically auto-loaded.
- **`AGENT.md`** (singular) is Amp/Sourcegraph's convention — which is what you asked for.

Rather than picking a side, keep one real file and symlink the rest:

```bash
git add AGENT.md
ln -s AGENT.md AGENTS.md
ln -s AGENT.md CLAUDE.md
git add AGENTS.md CLAUDE.md
```

Git stores symlinks natively and every tool finds its filename. One file to maintain, zero drift
between copies. On Windows-heavy teams where symlinks are awkward, make the alternates three-line
stubs that say `See AGENT.md` — never full copies, which desynchronize immediately.

**Note:** `REPO_SUMMARY.md` §6.11 and §7 both state this repo has no `AGENTS.md` / `CLAUDE.md`.
Both need updating once you land this.

---

## 7. Ignore files

Underrated, immediate win. When an agent greps or lists files, it pays tokens for every irrelevant
hit. Add `.claudeignore` / `.cursorignore` (mirror the contents):

```gitignore
.next/
**/.next/
**/storybook-static/
**/node_modules/
exported/
otf-web-fonts/
**/public/fonts/
pnpm-lock.yaml
packages/db/src/generated/
**/*.png
**/*.jpg
**/*.svg
**/*.woff2
**/*.otf
```

The Prisma generated client and `pnpm-lock.yaml` are the biggest offenders — both are enormous,
both are machine-generated, neither is ever the answer to a question.

---

## 8. Migration plan

Do it in this order; each phase is independently valuable and shippable.

**Phase 1 — same day (highest ROI)**
1. Land `AGENT.md` + symlinks + `ways-of-working.md`
2. **Add `pnpm type-check` to CI** — ~5 lines of YAML, snippet in `ways-of-working.md` §6.1. Not a
   docs change, but it is the only free feedback signal available to an agent today
3. Add `.claudeignore` / `.cursorignore`
4. Extract `.agents/context/known-drift.md` from §7 verbatim — 400 tokens, biggest error reduction
5. Delete root `.next/`

**Phase 2 — this week**
5. Split §2 → `glossary.md`, §4 → `implementation-status.md`, §6 → `components.md` / `forms.md` /
   `state.md` / `design-tokens.md` / `architecture.md`, §5+§6.4 → `data-layer.md`, §8 → `commands.md`
6. Add the four `apps/*/AGENT.md` and `packages/db/AGENT.md`
7. Change `REPO_SUMMARY.md`'s header from "read this first" to "deep reference — start at AGENT.md"

**Phase 3 — this month**
8. Write `verification-recipes.md` — the biggest gap given zero tests
9. Add `scripts/refresh-context.sh` and run it
10. Backfill 4–6 ADRs for decisions currently stated without reasoning
11. Write the ~10–20 **domain math** unit tests (cost formula, MMR deltas, calibration, EXP
    asymmetry, void reversals) per `ways-of-working.md` §6.1 — the one testing exception while
    everything else stays deferred

**Phase 4 — ongoing**
12. Enforce the `implementation-status.md` update in PR review (see `ways-of-working.md` §7 step 10)
13. Quarterly: regenerate `REPO_SUMMARY.md`, re-stamp every `Last verified` date

---

## 9. What not to do

- **Don't delete `REPO_SUMMARY.md`.** It is excellent for human onboarding and deep audits. Demote
  it to T3; don't destroy it.
- **Don't duplicate content across tiers.** The moment the same rule lives in two files, they
  diverge, and an agent reading the stale one writes wrong code. `AGENT.md` should *point*, not
  restate. Where I did restate (the four vocabulary distinctions, the write path), it is because the
  cost of an agent getting it wrong exceeds the cost of one duplicated paragraph — keep that bar
  high.
- **Don't let `AGENT.md` grow.** It will want to. Every time someone adds a section, something else
  moves to T2. The 250-line cap is the whole mechanism; without it you rebuild the original problem
  in 18 months.
- **Don't write aspirational context.** "We use TDD" in a repo with zero tests teaches agents that
  your docs are fiction, and they will start discounting the accurate parts too. Your summary is
  already admirably blunt about mocks — hold that line.
- **Don't over-split.** Ten context files is right. Forty is a new navigation problem, and agents
  will read six when they needed one.
