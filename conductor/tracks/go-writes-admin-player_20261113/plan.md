# Plan: Admin and Player writes in Go

**Track ID:** go-writes-admin-player_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #877 (one issue for the whole track, under epic #869).

## Phase 1: Admin

- [ ] **1.1** Characterize + port each Admin write group
- [ ] **1.2** Audit events identical

## Phase 2: Player

- [ ] **2.1** Characterize + port each Player write group

## Phase 3: Switch

- [ ] **3.1** Add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo); manual check locally

## Rule case runs (R3)

Vitest cases ported into Go tests under `apps/api/internal/rules/<area>` (a Vitest `it.each` row counts as a case; the Go tests also pin what the Route Handlers captured, which Vitest does not):

| Rule | Vitest file | Vitest cases | Ported | Not ported |
|---|---|---|---|---|
| club | `club/club.rules.test.ts` | 12 | 10 (1 by the pilot: names) | 2: the Facebook post text (#730), a Queue rule that formats times in the browser's locale |
| club price, money | `schema/src/club-price.test.ts`, `money.test.ts` | 25 + 25 | 23 + 25 | 2 rows whose input is `null` / `undefined` (no Go value) |
| license | `license/license.rules.test.ts` | 29 | 29 | none |
| ranking settings | `ranking-settings/rankingSettings.rules.test.ts`, `schema/src/ranking-settings.test.ts` | 30 + 31 | 30 + 31 | `ranking-settings/fetchers.test.ts` (8): TypeScript fetchers, no rule |

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-19 | 1.1 flags | `POST /api/feature-flags` with a `commandId` Postgres refuses (missing, not a UUID, a `urn:uuid:` form, spaces) answers 422 `invalid` with no fields | The Route Handler crashes on it with a 500 (Prisma). Postgres's own UUID forms (braces, hyphens after any four digits, either case) still pass | Pinned with `goExpects` in `flags.cases.json` |
| 2026-11-19 | 1.1 flags | A former or unknown admin gets 401 `unauthenticated`, not 403 `wrong_account` | The sign-in pass check is the same as the reads' (see `admin.cases.json` `guard_former_admin`) | Pinned with `goExpects` |
| 2026-11-19 | 1.1 flags | A request body over 1 MiB is answered like a body that is not JSON (422) | Next has no limit; an open reader is a memory risk in a long-lived server | Go-only guard, tested in `internal/writes` |
| 2026-11-19 | 1.1 flags | Two adds of one command under different keys can both answer 201 with one audit event (the second finds the first's event in `recordAudit` and writes none) | The TypeScript does the same (the lookup, then the insert); timing decides | Ported as is; tested for what always holds in `flags_race_test.go` |
| 2026-11-19 | 1.1 clubs | **Add club is one transaction, no provider.** `POST /api/clubs` stages the club, its account, its entitlement row and `club.created` as the TypeScript does, then (no Supabase) makes the club's sign-in identity (`auth_identities`, audience `club`, login key = the username trimmed and lower-cased as `signin` does, argon2id from the shared `Hasher`, hashed before `BEGIN`), points `club_accounts.auth_subject` at it (`auth_provider` is `rotra`, was `supabase`), and records `club.account_provisioned`, all in one transaction. The account is inserted then updated, so its revision is 2 as in the TypeScript. A retry of a command resumes a club the TypeScript staged without a login; a second retry at once finds the account provisioned (club row lock) | No Supabase Auth any more (go-sign-in deviation 3.2) | The capture mocks the provider call only (`capture-writes-clubs.test.mjs` header); `auth_provider` and `auth_subject` are not in the shared snapshot; `clubs_test.go` pins the identity and signs the new club in through the real pass check |
| 2026-11-19 | 1.1 clubs | A club password of 1025 characters or more is `invalid` on `password` ("Use 1024 characters or fewer."); 8 UTF-16 units is still the minimum | The route has no maximum, the shared password rules cap the hash cost at 1024 | Go-only guard, tested in `clubs_test.go` (not in the golden file: the rows differ) |
| 2026-11-19 | 1.1 clubs | A `sourceCommandId` Postgres refuses answers 422 `invalid` with no fields, for Add club, Activate license (after the club row lock, as the TypeScript order has it) and Save configuration | The Route Handlers crash with a 500 (Prisma) | Pinned with `goExpects` |
| 2026-11-19 | 1.1 clubs | A club ID that is no UUID answers 404 `not_found` for `POST .../licenses`, and for `PATCH /api/clubs/{clubId}` when it is 36 hex digits and dashes that are no UUID | The Route Handlers crash with a 500 (Prisma, or the `::uuid` cast); the Admin read answers 404 for the same | Pinned with `goExpects` |
| 2026-11-19 | 1.1 licenses | The date paid is read as `YYYY-MM-DD` (year 1 to 9999, month 1 to 12, day 1 to 31, rolling over as JavaScript does: 2026-02-30 is 2026-03-02) or `+YYYYYY-MM-DD`; anything else is `invalid` on `paidOn` | The Route Handler builds `new Date(`${paidOn}T00:00:00Z`)`: text that is no date, a year 0 or beyond 9999, or a day 0 or 32 is a 500; one case it takes that Go does not: the date followed by a NUL character | `internal/rules/license` `ParsePaidOn`; the 500 cases pinned with `goExpects` |
| 2026-11-19 | 1.1 licenses | Two licenses for two clubs at once can both read the same count of terms and take one `LIC-` reference; the second insert fails on the unique reference and answers 500 | The TypeScript counts every club's terms under one club's lock only, and has no retry | Ported as is (`TestRaceOfTwoClubsTakingTheSameReference`); **owner decision**: retry on the unique reference, or a sequence |
| 2026-11-19 | 1.1 licenses | The stored access end is read at millisecond precision (truncated) and the entitlement it is copied to loses its microseconds, as in the TypeScript; the service adds months with `setUTCMonth` (Jan 31 + 1 month = Mar 3), the rule in `license.rules.ts` clamps (Jan 31 + 1 = Feb 28) | JavaScript dates; two ways of adding months in the TypeScript | Both ported (`AddMonthsOverflow`, `AddMonths`); not reconciled |
| 2026-11-19 | 1.1 clubs | The name review reads the request before it locks the club and does not read it again, so two decisions on one request at once can both apply (a second `club.name_change_*` event, the club's revision counted twice, a request rejected over a club that was renamed) | The TypeScript order (`reviewClubNameChange`), timing decides | Ported as is; `TestRaceOfDecisionsOnOneRequest` tests what always holds; **owner decision**: re-read the request after the lock |
| 2026-11-19 | 1.1 clubs | An Add club retried at the same moment as itself can answer 201 twice or 201 and 409 (the loser finds the winner's club, or loses the unique command); two creates with one name or username give one 201 and one 409 | Timing, in the TypeScript too | `TestRaceOfTheSameAddClubCommand`, `TestRaceOfTwoClubsWithOneUsername`; the two-name race is also in the golden file with the winner redacted |
| 2026-11-19 | 1.1 clubs | The club login key is `strings.ToLower(strings.TrimSpace(username))`, which is what `signin` looks up; the stored `club_accounts.username` is lower-cased as JavaScript does (`i` plus a combining dot for U+0130, a final sigma). For those two letters, the capital the club may type signs in to a different key than JavaScript's | `signin` lower-cases with the simple Go mapping | **Follow-up** for `signin`: lower-case with the full mapping (`cases.Lower`) as `rules/club` now has it; tested with the shown username |
| 2026-11-19 | 1.1 ranking | `performanceWeightBp` is required (a save without it is `invalid` on that field), because the route reads a missing number as NaN; a number beyond a double (1e999) is Infinity as in JavaScript | Port of `int()` | `writes.Body.Number`; pinned in `ranking.cases.json` |
| 2026-11-19 | 1.1 ranking | Two saves of one command at once can both answer 201 (the same version) or 201 and 409; two saves of different commands on one version give 201 and 409 | The command lookup runs before the advisory lock | `TestRaceOfTheSameCommand`; the advisory lock key `hashtext('ranking_policy_versions')` is the TypeScript's, so a Go save and a Next.js save serialize |
| 2026-11-19 | 1.1 clubs | A command ID that already belongs to an audit event (of any kind) makes `recordAudit` find that event and write none: Add club and Activate license still write their rows, with no `club.created` / `club.license_*` event (R1: an event is missing) | `recordAudit` is repeat-safe on the command id across every action; the TypeScript does the same | Ported as is, pinned (`command_of_an_old_audit_event_creates_the_club_without_an_event`, `command_of_an_audit_event_writes_the_term_and_no_event`); **owner decision**: scope the repeat check to the action and target |
| 2026-11-19 | 1.1 licenses | Unexpected errors (500) the TypeScript has and Go keeps: a paid license of amount 0 (the table check wants more than 0), an amount or a club price above 2147483647 (32-bit columns), a taken `LIC-` reference with no race (a term row deleted or renumbered), a ranking save or license whose command is of another kind of event (the row it names is not there) | No validation in the service, so a database error answers 500 | Pinned with `allow500` cases; Go's rows are compared too |
| 2026-11-19 | 1.1 licenses | A paid license has no fallback to the club's listed price: `amountMinor` missing is `invalid` on `amount` | The route reads a missing number as NaN, so the service never sees "no amount" | Pinned (`amount_missing_is_invalid_for_a_paid_club`) |
| 2026-11-19 | 1.1 clubs | A `price` whose `pricing` is missing or any text but `free` makes a paid club (the amounts are then checked); `price` as an array or text is an empty price and fails the same check | The route only tests `price.pricing === 'free'` | Pinned (`price_pricing_missing`, `price_pricing_other_text`, `price_free_inside_an_array_is_invalid`) |
| 2026-11-19 | 1.1 clubs | `PATCH /api/clubs/{clubId}` is the name review only and takes no `expectedRevision`: its conflict is the pending request's ID not being the one sent, and an unknown club is `conflict` (409), not `not_found`; the answer is built from the first read. `setClubPricing` (admin/clubs.ts) has no route in the Admin app (the price change is mock-only), so it is not ported | The TypeScript routes | Pinned (`clubname.cases.json`); nothing to port for the price |
