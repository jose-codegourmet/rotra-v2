# Track specification: Shared queue rules (one Go copy, run on the device as WebAssembly)

**Track ID:** rule-cases_20261113 · **Type:** chore · **Priority:** critical (order 1 of 12) · **Created:** 2026-11-13 · **Refined:** 2026-11-14
**Depends on:** phases 1–3 nothing; phases 4–6 go-api-foundation (the Go module) · **Decisions:** D-2026-11-13-02, D-2026-11-13-08, D-2026-11-14-01, B-02, B-20, B-21, B-22, B-23 ([register](../../../docs/mvp/decisions.md#d-2026-11-14-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The Queue device keeps working offline by running the rules over its downloaded session, then replays
each change to the server ([offline module](../../../docs/business_logic/product/queue/modules/offline/README.md),
D-2026-11-11-04). When Go replaces the server, any rule that **both** sides run must give the same
answer, or the Queue Master gets a false Q-CONFLICT, a different court fill, or a different game count.

Two copies of those rules (TypeScript and Go) drift in ways example cases don't catch: name sorting
(`localeCompare` in `computeStandings` vs Go byte order), unstable sorts, Go map order, rounding,
time zones, null vs missing. So the shared rules get **one copy, in Go**: the server calls it directly,
and a WebAssembly build of the same code runs on the device ([D-2026-11-14-01](../../../docs/mvp/decisions.md#d-2026-11-14-01)).

A spike comes first. If WebAssembly doesn't meet the pass marks, the track falls back to two copies
with guards (see [Fallback](#fallback-if-the-spike-fails)).

Every other rule runs on the server only and moves straight to Go in the track that owns its route.

## How a rule is classified

The test is the **outbox command registry** ([outbox/commands.ts](../../../packages/data/src/outbox/commands.ts)):
a command listed there is applied on the device offline and again on the server at replay. A rule that
any listed command runs is **shared** (bucket 1: Go, also built to WebAssembly). A rule that only
online-only writes or reads run is **Go-only** (bucket 2). A rule with no server counterpart (labels,
search, layout, outbox mechanics, match generation) is **TS-only** (bucket 3).

## Bucket 1: Shared (queue and matchmaking), one Go copy

| Area | Rules (source) | Run by commands | Existing cases |
|---|---|---|---|
| Court fill | `autoFillPlacements`, `nextEligibleForCourt`, `nextMatchCandidates` ([match.rules.ts](../../../packages/data/src/match/match.rules.ts)); `autoFillCourts`, `putOnCourt`, `courtFillModeOf` ([courtFill.ts](../../../packages/data/src/queue-session/courtFill.ts)) | almost every queue/match command (server auto-places after the write) | `autoFill.rules.test.ts`, `courtFill.test.ts` |
| Match guards | `canPlace`, `canStart`, `canSendBack`, `canMoveCourt`, `canReplacePlayer`, `replacedLineup`, `swapTarget`, `validateResult`, `matchStatus`, `completeLineup`, `substitutionCandidates`, `courtsNeeded`, `holdsCourt`, `FORMAT_TEAM_SIZES` | `match.*`, `queue.*` (every lineup the device sends is checked with these; Q3) | `match.rules.test.ts`, `control.test.ts` |
| Courts and time | `courtOpen`, `openedEarly`, `freeCourts`, `isBookingEnded`, `sessionEndError`, `sessionEndCourtConflict` ([queueSession.rules.ts](../../../packages/data/src/queue-session/queueSession.rules.ts)) | `courts.*`, `session.end`, `session.extend` | `courts.test.ts`, `sessionEnd.test.ts` |
| Game counts | `countedGames`, `countsFor`, `countedTeam`, `creditedPlayers`, `substitutionSlots`, `isPartial`, `gamesPlayed`, `gamesAdjustmentOf`, `waitMinutes`, `queuedCount`, `computeStandings` | `match.complete`, `match.substitute`, `roster.gamesPlayed`; feeds generation | `match.rules.test.ts`, `gamesAdjustment.test.ts` |
| Roster and waitlist | `inUnfinishedMatch` (step-down guard), duplicate check, `openSlots`, `slotCapacity`, waitlist fill order, give slot | `roster.*` | `presenceBatch.test.ts`, `rosterBatch.test.ts` (partial) |

Only the pure rule functions move. Code that touches the mock store or database (the store-writing
half of `autoFillCourts`, `putOnCourt`) stays in TypeScript on the device and in Go services on the
server, and calls the rules.

Payments are **not** shared (owner, 2026-11-13: money is Go only). See [Payments offline](#payments-offline).

## Bucket 2: Go-only (port directly in the owning track)

Rules that only online-only writes or server reads run. Port the Vitest cases into Go tests in the
track that moves the route; no JSON and no WebAssembly.

| Area | Rules | Why Go-only | Moves in |
|---|---|---|---|
| Session cost and payments | `estimateSessionCost`, `amountDuePerHead`, `defaultShuttlePlan`, `paymentStatus`, `statusForReceived`, `receivedAmount`, `paymentTotals`, `@rotra/schema` money and club price | Owner: money is Go only. Offline the device records marks; Go computes amounts on sync | go-writes-queue (R3) |
| Session setup and start | `estimateMinimum`, `expectedGames`, `startBlocker`, `startNewEndError`, `startNeedsNewEnd`, `rebalanceSlots`, `sessionOccurrences`, clash, cancel reason | Setup, Start, cancel are online only | go-writes-queue |
| Session done and results | `sessionStandings`, `computeAwards`, `awardBaseline`, `createResultSnapshot`, `invalidateSession`, `sessionRecordHistory` | Session done and Publish are online only | go-writes-queue |
| Match requests and join requests | `matchRequest.rules`, `requestLineup`, `closeStaleMatchRequests`, `requestDecisions` (confirm, link, drop-out) | Not in the command registry; decided online | go-writes-queue |
| Player view | `public-session/rules`, `profile-banner/rules`, masking | Server reads | go-public-reads, go-signed-in-reads |
| Ranking settings | `rankingSettings.rules`, `@rotra/schema` ranking-settings | Admin, online | go-writes-admin-player |
| License, club, sales, feature flags, admin player, contact change, player, club price | their `*.rules.ts` | Online only (club settings page is unavailable offline) | go-writes-admin-player, go-signed-in-reads |
| Phone, court window parsing | `@rotra/schema` phone, court-window | Online forms | the track that ports the form's route |

Money and ranking rules here still need owner sign-off on the Go port (stop and ask), as today.

Some of these rules also run in the browser today (the setup form's cost and minimum previews, form
checks in `@rotra/schema`, mock mode). Those TypeScript copies are **deleted on the `go-stack` branch**
(B-20), and the screens that ran them are updated there to ask the API instead ([D-2026-11-13-08](../../../docs/mvp/decisions.md#d-2026-11-13-08)).
`main` keeps them until `go-stack` merges at ship.

### Payments offline

Ticking paid, setting a received amount and Mark all paid still work offline (offline table). What
changes with "Go only": the device records **what the Queue Master entered** (paid mark, amount
received), and Go works out the amount due and the status when the change syncs. The device today
recomputes the amount due from the cost estimate on every read
([session-payment/fetchers.ts](../../../packages/data/src/session-payment/fetchers.ts)), and offline
changes such as adding a guest, a court or extra time change that amount. So offline the screen should
show the **last synced amount due**, marked as checked when synced, instead of a fresh device number.
That is a screen change: it goes through the mockup first (AGENTS rule 15, on `main`; backlog BL-4),
then lands on the `go-stack` branch before go-writes-queue ports payments.

## Bucket 3: TS-only (no Go counterpart)

**Match generation (Q3):** `seededRng`, `generateMatches`, `splitTeams`, `balanceTeams`,
`previewMakeMatch`, `arrangeToBalance`, `regenerateScope`, `suggestionReason`,
`generateAutoQueueMatches` and the bagging rules. The device makes the lineup and sends it; the server
only checks it with the shared match guards. Their Vitest cases stay where they are.

Labels and copy (`FORMAT_LABELS`, `timeLabel`, `whenLabel`, toasts), search (`queueSearch.rules`,
`directorySearch`), export frames and pagination, the draft-selection state of Auto Queue, and the
outbox mechanics (`aliasArgs`, `learnAliases`, `mergeImported`, `parsePlayHistory`, `orderCommands`).
The replay **protocol** (idempotent `operationId`, `expectedQueueRevision` 409s, created-id aliases) is
Go's contract to honour, covered by go-writes-queue R1.

## Where the rules live

One Go module at `apps/api` ([tech stack](../../tech-stack.md)). Every rule is a pure function under
`internal/rules/<area>`: no database, no HTTP, no clock or random numbers of its own (the caller passes
`now` and the data). Folder names follow `packages/data/src/<area>`. Go's `internal/` can only be
imported inside `apps/api`, so the WebAssembly entry point lives there too.

```text
apps/api/
  cmd/
    api/main.go
    ruleswasm/main.go                            bucket 1 only, exported to JavaScript
  internal/
    rules/
      match/  courts/  roster/  courtfill/        bucket 1: Go tests read @rotra/rule-cases; built to WebAssembly
      sessioncost/  payment/  sessionsetup/        bucket 2: Go tests ported from Vitest
      sessionresult/  matchrequest/  license/
      club/  rankingsettings/  sales/  adminplayer/
      contactchange/  player/  parse/ (money, phone, court window)
    queue/  admin/  player/                       services and database queries; call internal/rules
    http/                                         router, error and JSON contracts
    rulecases/                                    test helper reading packages/rule-cases/cases/*
packages/
  rule-cases/                                     JSON cases (parity check, then the Go tests)
  rules-wasm/                                     built .wasm + typed TypeScript wrapper; packages/data imports it
```

**The wrapper** keeps today's function names and signatures, so hooks and screens don't change. It
loads the WebAssembly once (browser, server, mock store, Vitest, Storybook), then calls synchronously.
See [Wiring](#wiring-g8g12) for where it must be ready and how it survives a crash.
Data crosses as JSON in the [case shape](#r2-two-case-kinds) (money in minor units, ids as strings,
times as epoch milliseconds), so the cases test exactly what the device sends.

**Time zones.** Bucket 1 rules take times as epoch milliseconds plus the session's schedule in the
same form; the caller resolves the club's zone. The WebAssembly build carries no time-zone database
unless the spike shows a rule needs one.

Who builds what:

- **This track:** the cases, the spike, the bucket 1 Go rules, the WebAssembly build, the wrapper, and the swap on `go-stack`.
- **go-api-foundation:** the Go module, the `internal/rules` skeleton and the `rulecases` helper.
- **The track that moves a route:** that route's bucket 2 rules, with their tests.
- **UI tickets on `go-stack`** (B-20): delete the TypeScript copies of bucket 2 rules and update the UI that ran them.

## Gaps found

- **G1. Random numbers differ today** (server `seededRng(operationId)`, device `Math.random`). Settled by
  [Q3](#q3-random-lineups-decided): the device sends its lineups; generation is bucket 3.
- **G2. Clock.** The server uses its own `new Date()` on replay ([match-control.ts](../../../packages/db/src/queue/match-control.ts)).
  Settled by [Q2](#q2-time-on-replay-decided): replay uses the device's time, checked against the schedule.
- **G3. Case shape.** Replay parity also needs **command cases**. This track defines the shape; go-writes-queue writes them.
- **G4. Cases hide outside `*.rules.test.ts`** (`courtFill`, `courts`, `sessionEnd`, `gamesAdjustment`,
  `control`, `presenceBatch`, `rosterBatch`, `queueFeatures`). Sources are listed per rule above.
- **G5. No cases at all** for `nextMatchCandidates`, waitlist fill order and give slot.
- **G6. Language differences.** One copy removes them for bucket 1. Cases that pin ties, accented and
  mixed-case names, and rounding edges make sure the Go port matches today's TypeScript before the swap.
- **G7. Version skew (B-22).** A device with an older app keeps an older cached `.wasm`. Settled by
  versioning per Queue Session, see [Rules versions](#rules-versions-b-22).
- **G8. Rules run while screens render.** Queue screens call bucket 1 rules as they draw (for example
  `OnCourt.tsx`: `countedGames`, `freeCourts`, `matchStatus`, `waitMinutes`), Next.js draws `'use client'`
  screens on the server first, and fixtures call rules when the file loads (`liveStandings.ts`:
  `computeStandings`). The rules must be ready before the first draw, on the server too.
- **G9. The TypeScript server imports the same rules.** `packages/db` imports them from `@rotra/data`
  (`match-control.ts`, `public-session.ts`), so deleting them on `go-stack` would break its build.
- **G10. One Go crash stops every later call.** A panic inside WebAssembly ends the Go program; every
  later rule call fails until the page reloads.
- **G11. TypeScript and Go can disagree on data shape silently.** A renamed Go field reads as empty when
  TypeScript sends the old name; no error, just a wrong answer.
- **G12. Loading and caching.** An older phone can open a session on a newer rules version; the Queue
  app has no service worker, so nothing loads offline after a reload today; the public session page
  (players on mobile data) uses `computeStandings` and `waitMinutes` in mock mode.

## Wiring (G8–G12)

- **Ready before the first draw (G8).** On the server the wrapper loads the `.wasm` from disk when the
  module loads. In the browser the session screens wait on a "rules ready" step before drawing.
  Fixtures work out their values when first used, not when the file loads.
- **The TypeScript server uses the wrapper too (G9).** On `go-stack`, `packages/db` calls the same
  wrapper on the server instead of the deleted TypeScript rules, so there is one copy there as well
  until `packages/db` retires at ship.
- **Crash-safe (G10).** Every exported Go function recovers from a panic and returns an error; the
  wrapper restarts the WebAssembly if the Go program ever stops. Go's `wasm_exec.js` loader is committed
  with the `.wasm`, pinned to the same Go version.
- **Generated types (G11, B-23).** The wrapper's TypeScript types are generated from the Go structs with
  `tygo` and committed; CI regenerates them and fails on a difference, like the `.wasm`.
- **Fetch the right version (G12).** When a device downloads a session (online), it also fetches the
  latest `.wasm` if its own lacks the session's rules version.
- **Cached like the app's JavaScript (G12).** The `.wasm` is a content-hashed asset served as immutable,
  the same as the JavaScript files. Offline works while the tab stays open, as today; loading after an
  offline reload waits for a service worker, which is not in this track.
- **Public pages never load it (G12).** The public session page gets standings and wait times from the
  API; on `go-stack` its mock mode uses fixture values. Only the Queue operator screens load the `.wasm`.
- **Storybook** gets a decorator that loads the `.wasm` for stories that use rules.
- **Content security policy:** none today; if one is added, it must allow `wasm-unsafe-eval`.

## Shipping a rule change (G13–G15)

- **G13. CI paths.** Backend CI's `scope` job only allows `apps/api/`, `packages/rule-cases/`, Railway
  files and docs, but a Go rule change must commit the rebuilt `.wasm` and generated types in the same
  PR. **Fix:** `packages/rules-wasm/` joins the backend paths in `.github/workflows/backend.yml` (it is
  generated from Go), treated like `packages/rule-cases`: frontend CI skips it, so Railway's "Wait for
  CI" sees one workflow, and `make check` checks the frontend side (G15 fingerprint, Vitest through the wrapper).
- **G14. Deploy order.** Railway (Go API) and Vercel (apps) deploy separately; if the server stamps a
  version before the live `.wasm` has it, phones get a session they can't run. **Fix:** every app deploy
  publishes `rules-manifest.json` next to the `.wasm`, listing the versions it carries. At Start the Go
  API stamps the **highest version both it and the live manifest have** (manifest cached about a
  minute). If the manifest can't be read, it keeps the last version it confirmed and never guesses
  upward. `RULES_VERSION_MAX` (Railway, normally unset) caps it, to hold a new version back. The server
  refuses to start if that cap names a version its code doesn't have. No manual switch and no
  maintenance mode: running sessions keep their version, new ones move up on their own.
- **G15. The build check is advisory.** CI never blocks, and `make check` runs without Go. **Fix:**
  `packages/rules-wasm` records a fingerprint (hash) of the Go rule files it was built from; `make check`
  recomputes it in Node and fails if it differs. No Go needed, and it is a real gate.

## Rules versions (B-22)

One `rulesVersion` number covers the whole shared set. Start is online only, so the server stamps the
Queue Session with the newest version that both the server and the live `.wasm` carry ([G14](#shipping-a-rule-change-g13g15)); the device stores it with its offline copy. Every offline
command runs under the session's version on the device and again on the server at replay, so a rule
change never applies mid-session.

- **Pattern: Strategy with a versioned registry.** Each version is a `Ruleset`, a struct of rule
  functions. A change adds a new function only for the rule that changed (`CanPlaceV2`) and a new
  version that reuses the rest. Services call `rules.For(session.RulesVersion)`, never a rule directly;
  an unknown or retired version is an error that reaches Q-CONFLICT.

  ```go
  var rulesets = map[int]Ruleset{
      1: {CanPlace: match.CanPlaceV1, Fill: courtfill.FillV1 /* … */},
      2: {CanPlace: match.CanPlaceV2, Fill: courtfill.FillV1 /* … */}, // only CanPlace changed
  }
  ```

- **One build, every live version.** The `.wasm` carries every live version; the wrapper is set to the
  session's version when the session loads, so hooks and screens still call the same names.
- **Cases per version:** `cases/v<n>/<area>/<rule>.json`; tests run every live version.
- **Live versions:** removed once no open or unsynced session uses them; normally current and previous.
- **Bumping:** any change to what a shared rule returns bumps the version; a refactor with identical
  results doesn't, and the cases prove it.
- **Retired:** a version with a real bug is marked `retired` (owner's call, rare). The server rejects it;
  the device loads the latest build and moves the session to the current version at its next sync,
  with a notice to the Queue Master.
- **Database:** `rules_version` on `queue_sessions` (proposed in [sessions-roster](../../../docs/database_design/product/queue/modules/sessions-roster.md));
  the migration lands in go-writes-queue (stop and ask before applying).

Version 1 is today's behavior, pinned by the cases in R3 and R4.

## Requirements

### R0: Spike (throwaway, not merged)

On a `spike/rules-wasm` branch, build `canPlace`, `waitMinutes` and `courtOpen` to WebAssembly with
**standard Go and with TinyGo**, behind a wrapper, and measure. B-21 picks the tool: standard Go if it
passes every mark, TinyGo if not; the owner is asked only if both fail.

| Check | Pass mark (owner confirmed 2026-11-14) |
|---|---|
| Compressed `.wasm` size | under 1.5 MB (B-21: downloaded once per rules version) |
| First load on a mid-range Android phone | under 300 ms |
| Court fill call cost on a 12-court session (JSON in and out) | under 5 ms |
| Runs in Vitest under Node | yes |
| Runs in mock mode in the Queue app | yes |
| Second visit loads from the browser cache; rules keep working offline with the tab open | yes |
| Committed file rebuilds identically in CI; Vercel serves it with no Go installed | yes |

**Accepted when:**

- [ ] Results recorded in the plan; the tool picked by the B-21 rule and its version pinned
- [ ] Owner confirms go or fallback

### R1: Cases package

`packages/rule-cases` (`@rotra/rule-cases`): JSON only, `cases/v<n>/<area>/<rule>.json` (B-22; everything starts in `v1`), `exports` subpaths, no barrel.

**Accepted when:**

- [ ] Package added with the D-2026-11-13-02 layout
- [ ] Root workspace and `turbo.json` know it; nothing imports code from it

### R2: Two case kinds

- **Rule case:** `{ kind: "rule", rule, version, cases: [{ name, input, expected }] }`.
- **Command case:** `{ kind: "command", command, version, cases: [{ name, before, args, operationId, now, expected: { after } | { rejected } }] }`.

Money in integer minor units, ids as strings, times as epoch milliseconds, every case that reads the
clock carries `now`. No shared rule uses random numbers (Q3).

**Accepted when:**

- [ ] A JSON Schema covers both kinds; every case file validates

### R3: Move the bucket 1 cases

Copy the existing cases for bucket 1 rules into JSON with unchanged values. Bucket 2 and 3 cases stay in Vitest.

**Accepted when:**

- [ ] Each moved Vitest test reads its JSON and still passes
- [ ] Case counts per rule match before and after; recorded in the plan

### R4: Fill the gaps (G5, G6)

New cases that pin **today's** behavior, no behavior change: `nextMatchCandidates`; waitlist fill
order; give slot; standings ties with accented and mixed-case names; rounding edges; court-fill ties.

**Accepted when:**

- [ ] Each new case passes against the current TypeScript

### R5: Port bucket 1 to Go (after go-api-foundation)

Write the bucket 1 rules in `internal/rules/{match,courts,roster,courtfill}`, following the
determinism checklist, behind the versioned registry (`rules.For(1)`): stable sorts, no map iteration that decides order, names compared the way the
cases pin, explicit rounding, times as epoch milliseconds.

**Accepted when:**

- [ ] Every bucket 1 case passes in Go through the `rulecases` helper, for every live version
- [ ] Services reach rules only through `rules.For(version)`
- [ ] Go case tests run in Backend CI (no deploy if red); `make check` gates the build through the fingerprint (G15)

### R6: WebAssembly build and wrapper

`cmd/ruleswasm` exports the bucket 1 rules for every live version; `packages/rules-wasm` holds the build and the typed wrapper, set to the session's version when the session loads.
B-21: the built file is committed and ships with the apps as a static file named `rules.<hash>.wasm`,
served as immutable, cached like the app's JavaScript (no S3). Wiring as in [G8–G12](#wiring-g8g12).

**Accepted when:**

- [ ] Every bucket 1 case passes through the wrapper in Vitest, the same cases the TypeScript passes
- [ ] CI rebuilds the file and fails if it doesn't match the Go source
- [ ] A second load of the same version downloads nothing (browser cache)
- [ ] Loads in the browser, on the server (Node), in Vitest and in Storybook
- [ ] A forced panic returns an error, and the next call still works
- [ ] TypeScript types generated by `tygo`; CI fails if they differ from the Go structs
- [ ] `make check` fails when the Go rule files' fingerprint differs from the one the build recorded (G15)
- [ ] `rules-manifest.json` is published with the apps and lists the versions in the `.wasm` (G14)
- [ ] A PR touching `apps/api/` and `packages/rules-wasm/` passes the backend `scope` job (G13)

### R7: Swap on `go-stack`

`packages/data` imports the wrapper instead of its own bucket 1 rules; the TypeScript bucket 1 rules
are deleted there, and `packages/db` calls the wrapper too (G9). Session screens wait on "rules
ready"; fixtures compute when first used; the public session page stops calling bucket 1 rules (G8,
G12). A device fetches the latest `.wasm` when the session it downloads needs a version it lacks.
`main` keeps the TypeScript rules until ship.

**Accepted when:**

- [ ] A TypeScript rule is deleted only after its cases pass on both TypeScript and WebAssembly
- [ ] `packages/db` builds and passes on `go-stack` with no TypeScript bucket 1 rules
- [ ] The first server-drawn Queue screen shows correct values (no rule called before it's ready)
- [ ] The public session page loads no `.wasm`
- [ ] Queue works offline in the beta project with the WebAssembly rules, tab kept open (manual check, recorded)

## Fallback if the spike fails

Keep two copies (TypeScript on the device, Go on the server), with four guards:

1. A determinism checklist for the Go port (as in R5).
2. A comparison test: TypeScript generates random inputs and records its outputs; Go must match them.
3. Versioning per Queue Session (B-22), which works the same with two copies.
4. Go case tests in `make check`.

R0 records the fallback choice; R6 and R7 are then replaced by guards 2 and 4.

## Owner answers

- **Q1 / Q4 (2026-11-13). Money is Go only.** Cost and payment rules move to bucket 2. See [Payments offline](#payments-offline).
- **One copy per rule (2026-11-13).** TypeScript copies of bucket 2 rules are deleted on `go-stack` (B-20).
- **WebAssembly (2026-11-14).** Bucket 1 also gets one copy: Go, built to WebAssembly for the device, behind the spike gate ([D-2026-11-14-01](../../../docs/mvp/decisions.md#d-2026-11-14-01)).

### Q2. Time on replay (decided)

A change made offline happened when the device says it did: on replay the server uses the command's
`recordedAt` as `now`, not its own clock. The server then **checks that time against the schedule and
the records it already has**, and anything that doesn't fit goes to Q-CONFLICT for the Queue Master,
never silently fixed or dropped:

- inside the session: after it started, before its end (with extensions) plus a grace period;
- not later than when the server received it;
- in order for its own match: placed ≤ started ≤ completed, and never before an earlier event the
  server already has for that match or court;
- a court use within that court's booking window (or after an early open).

Command cases carry `now` = `recordedAt`. The grace period and the exact checks are written in
go-writes-queue and need the owner's OK there (backlog BL-2).

### Q3. Random lineups (decided)

**Replay the result, not the dice roll.** Generate matches on the device (online and offline), send
the lineups it made, and have the server **check** them with the match guards instead of generating
its own. The Queue Master can already add any lineup by hand (`queue.make`), so this adds no new trust.
`seededRng`, `generateMatches`, `generateAutoQueueMatches` and the bagging rules become device-only.
The Auto Queue, Regenerate and Suggest requests send lineups instead of `n`; commands already queued in
the old shape keep the old path until they drain. Contract change ticketed in go-writes-queue (backlog BL-3).

All answers are recorded as [D-2026-11-13-08](../../../docs/mvp/decisions.md#d-2026-11-13-08) and
[D-2026-11-14-01](../../../docs/mvp/decisions.md#d-2026-11-14-01).

## Branches and PRs

- **`main`:** R1–R4 (cases, TypeScript only), R5 (Go rules), R6 (build and wrapper; nothing on `main` imports it).
- **`go-stack`:** R7 (the swap and the deletes).
- Backend CI's `scope` job rejects a change that mixes backend paths with frontend packages, so the
  JSON files and the Vitest switch go in separate PRs. `packages/rules-wasm/` is a backend path (G13),
  so a Go rule change, its rebuilt `.wasm`, its generated types and the wrapper merge in **one** PR.
  Switching `packages/data` to the wrapper is a frontend PR on `go-stack`.

## Scope

**In:** the spike, the cases package and both case shapes, bucket 1 cases and gap cases, the bucket 1
Go port, the WebAssembly build and wrapper, the swap on `go-stack`.

**Out:** command cases (go-writes-queue); bucket 2 ports (their tracks); changing any rule or case
value; the offline caching of the app shell (offline device-copy work), beyond loading the `.wasm`.

## Testing

R1–R4: TypeScript only. R5: Go tests over the cases. R6: the same cases through the wrapper in Vitest.
R7: a recorded offline click-through in the beta project (tab kept open). `make check` once at the end of each PR ([workflow](../../workflow.md)).
