# Database services (`@rotra/db`)

**Last verified:** 2026-11-01. **Status:** Server-only service code over the drafted, **unapplied**
schema. Not run against a database; lint, type-check and build were not run for these modules.
Every proposal below that depends on an open decision (#243–#248) is marked as such in the code.

Route Handlers call these through `handleAccountRequest` / `handlePublicRead` (architecture §8).
Each command is repeat-safe on its command or operation ID, checks the expected revision where the
screen loaded one, and returns an allowlisted DTO.

## F07.21 · Clubs, venues, licenses, configuration

| Module | Commands |
|---|---|
| `admin/clubs` | `stageClub` → `provisionClubAccount` (staged: database first, provider second, resumable on the club ID); `setClubPricing`; `readClubsForAdmin`; club-side `readClubSettings`, `updateClubSettings`, `requestClubNameChange`; owner `reviewClubNameChange`; `readVenues`, `saveVenue` |
| `admin/licenses` | `activateLicense` (club lock → one term per command → cancel the running expiry cycle → refresh entitlement); `refreshEntitlement`; `refreshLapsedEntitlements` (starts a new expiry cycle); `readLicenseTerms`, `readOwnLicense` |
| `admin/configuration` | `createFeatureFlag`, `setFeatureFlag` (expected revision), `saveRankingPolicy` (appends the next version under the expected current version) |
| `admin/audit` | `recordAudit`: redacted before/after metadata, repeat-safe on the command |
| `auth/provider-admin` | `ProviderAdmin` port for external Auth calls; the adapter is chosen under #243/#244 |

- A new Free club stores no paid prices and gets no fake license history.
- A renewal starts when current access ends, or now when lapsed (stacking is a proposal, #245).
- Saving a ranking policy records configuration only; it never claims ranks were refreshed.

## F07.22 · Identity matching, RTR ID allocation, profile reads

| Module | Commands |
|---|---|
| `player/identity` | `resolveClubPlayerIdentity` (after the entry syncs: phone advisory lock → reuse the player and allocation, or create player + private contact + RTR ID in one transaction; unique races retry from resolution); `resolveSessionIdentities` |
| `player/profile` | public `readPublicProfile`, `findPublicProfileByRtrId` (allowlisted `PlayerProfile`, only for allocated IDs); own `readMyAccount`, `readMyProfile`, `updateMyProfile` (expected revision, no contact fields), `setPhonePrivacy`; club `readClubVisiblePhone` (phone only, and only when not hidden) |
| `player/claim` | `issueClaimLink` (club's linked unclaimed player; token digest only; reissue revokes), `readClaimLink` (masked phone), `completeClaim` (provider login keyed on the link ID, then one transaction: email, account mapping, claimed, link consumed) |

- A phone already linked to a different club player in the same club is marked `conflicted` for review, never merged.
- Unclaimed and claimed profiles differ: only a valid link plus the provider login claims; a name or RTR ID never does.
- Historical guest attribution projections are F07.30.

## F07.33 · Staged contact approval, Auth reconciliation

| Module | Commands |
|---|---|
| `player/contact-change` | own `submitOwnContactChange`, `readOwnContactChanges`; owner `submitContactChangeForPlayer`, `readContactChangeQueue`, `reviewContactChange` (rechecks contact revision and collisions; reserves the value; changes no contact); `applyContactChange` (mark applying → provider update with the request's stable operation ref → reconcile); `reconcileContactChange` (marks `applied` only when provider and contacts agree); `detectContactDrift` |

- This module is the only writer of a claimed player's phone or email. Profile edits never accept contact fields.
- `approved`, `applying` and `failed` are all shown as "approved, not applied yet"; only `applied` is a change.
- A provider value matching neither the original nor the proposal fails closed as `provider_mismatch`.
- `detectContactDrift` compares both phone and email; whether the provider holds the phone as a login identifier depends on the adapter (#244).

## F07.24 · Public session reads, visitor-owned join requests

| Module | Commands |
|---|---|
| `queue/public-session` | `readPublicSession` (`public-session.page`: allowlisted `PublicSessionPage`, accepted state only; `finalizing` shows as active); `sendJoinRequest` (client `requestId`, same fields → same request; prepared + accepting only; per-session pending cap; duplicate pending phone refused); `readMyJoinRequest` (needs the receipt) |
| `service/handler` | `handleVisitorRequest` for account-less visitor calls with private, no-store headers |

- Ownership (proposal, #248): the receipt is an HMAC of the request ID under `ROTRA_VISITOR_RECEIPT_SECRET`, kept in an httpOnly cookie. Nothing about it is stored; a wrong receipt, another slug or an unknown ID are all `not_found`.
- A request never reserves a slot. Confirmation and decline stay in `queue/session-roster`, where the session lock serializes capacity and the waitlist.
- Request phones are returned only to the club (`joinRequestDto`), never by these reads.

## F07.25 · Revision-safe waiting queue commands

| Module | Commands |
|---|---|
| `queue/match-store` | `matchCommand` (session lock, active state, optional expected queue/session revision, bumps `queue_revision`); `matchView`/`matchDto` (stored segments → the shared `@rotra/data/match` shape); `nextMatchNo`, `nextQueuePosition` |
| `queue/match-queue` | `readSessionMatches`; `addManualMatch`, `makeMatch` (manual, protected); `suggestMatch` (no write; returns the revisions) → `addSuggestedMatch` (both revisions required); `autoQueue` (2, 3, 4 or 6); `regenerateQueue`; `moveMatch`; `updateWaitingLineup`; `removeWaitingMatch` |

- Match numbers come from the locked session's highest number + 1 and are never reused: removed and regenerated drafts keep theirs (`removed_at`, no queue position).
- Queue position is separate and only reorder/regenerate rewrite it.
- Each match is keyed on its operation ID (`source_operation_id`); a batch is keyed on the command as `generation_id`, so a retried Auto queue or Regenerate returns the same matches.
- Regenerate rebuilds only waiting non-protected drafts and protected entries that need attention; healthy manual entries and active matches are untouched. A stale queue revision is `conflict`.
- Generation reuses the prototype reference heuristic from `@rotra/data/match/queue.rules` with a seed from the operation; the final heuristic is still open.

## F07.26 · Atomic match start, substitution, permanent results

| Module | Commands |
|---|---|
| `queue/match-control` | `startMatch` (revalidates with the shared `canStart`, then one court hold per court — two for 5v5 — court usage rows and one player hold per player, all in one transaction); `substitutePlayer` (closes the outgoing segment and opens the incoming one under the same operation, moves the hold); `completeMatch` / `invalidateMatch` (close segments, release usage, free every hold, append the one decision) |

- Simultaneous starts lose on the hold primary keys (court, roster entry, known global player), so nothing is half-held.
- Winner-only results keep both scores null; scores must agree with the winner (`validateResult`).
- A retried terminal command returns the original outcome; an agreeing one from another operation returns it too; a contradicting one is stored as a `contradictory_decision` conflict and reported as `conflict`. Nothing ever updates a decision, and the SQL triggers freeze the match after it.
- Substituted players keep their segments; the shared counting rule gives neither credit. Invalid decisions produce no facts at finalization.

## F07.27 · Inventory, cost estimate, manual payments

| Module | Commands |
|---|---|
| `queue/financials` | `readInventory`, `saveInventoryItem` (client ID; expected revision on edit), `stepInventoryStock` (never below zero), `removeInventoryItem` (soft); `readSessionCost`, `saveSessionCost` (online only, prepared/active, expected estimate revision, this club's items only, empty = delete); `readSessionPayments`, `setPaid`, `markAllPaid` |

- All arithmetic is the pure `@rotra/data/session-cost/rules` (centavos; court fee to the nearest centavo; break-even up to a whole peso). Totals are derived at read time.
- A paid tick stores the amount due at that moment (null when no fee is set) under its operation ID; a duplicate applies once and later fee changes never rewrite it. Marks key on the released-not-deleted roster entry, so they survive demotion and show again on restoration. No-fee tick meaning is still #245.
- Payments stay open after Session done (`completed`), never for `invalid` or `finalizing`; they are separate from immutable results.
- No new money unit tests were added; the reused rules keep their existing tests.

## F07.28 · Server sync acceptance, stream closure, conflict evidence

| Module | Commands |
|---|---|
| `queue/sync` | `registerDevice`; `enrollStream` (online; takes the one-offline-session reservation; a second device or recovery must revoke the open stream, which records a `missing_prerequisite` conflict); `uploadOperations` (store envelopes → process the contiguous prefix); `sealStream`; `readSyncStatus`; `sessionCompleteness`; `resolveConflict`; `resumeSessionStreams` |

- Same operation ID + same canonical payload digest returns the stored receipt; a changed payload or another ID at a used sequence is a `payload_mismatch` conflict and the original envelope is kept.
- Uploads run the same domain services as online commands, with the operation ID as the command ID (`DISPATCH`). Unknown kinds are rejected; after Session done only payment marks are accepted (finalized payment boundary); service `conflict` → `conflicted` with evidence, other service errors → `rejected` with the code.
- Processing stops at the first gap; `contiguous_sequence` only moves over settled operations; a quarantined one holds it until resolved. Acceptance is recorded after the domain commit, and reprocessing is safe because every command is repeat-safe.
- A seal needs the full prefix and a matching digest (SHA-256 over the concatenated payload digests 1..N). The server never seals a stream itself.
- Completeness is proven only when every enrolled stream is sealed and fully settled, no conflict is open and nothing is unprocessed. An unused open stream keeps it unproven.
- Conflict authority (club account, online, unfinalized session) and the seal digest format are proposals pending #246. The browser outbox is Q11.

## F07.29 · One-time Session done, canonical result facts

| Module | Commands |
|---|---|
| `queue/finalization` | `reviewSessionDone` (blockers + minimum shortfall warning); `finalizeSession`; `readFinalizationStatus`; `settleFinalization` (moves `committed` → `done`/`failed` from job status); `invalidateSession` |

- Online only. Under the session lock: active state, no active match, completeness proven by `sessionCompleteness` (F07.28), and an effective ranking policy. Anything missing blocks with `conflict` and the blocker codes; nothing is fabricated.
- One transaction commits the `session_finalizations` row (its PK is the session, so a second commit is impossible), every fact, the per-entry summaries, `completed`, the released offline reservation and the downstream jobs (`result_snapshot`, `player_history`, `player_rank`). A retry, a concurrent duplicate or a lost response returns the committed status.
- Facts: one per (completed match, participant); full participation is recomputed from segments; invalid matches have no completed decision and produce nothing. Minimum shortfall is a warning only.
- Projection and slide failures retry their own jobs (F07.30/F07.31) and never repeat the commit. An invalid session gets no finalization and no contribution.

## F07.30 · History, ranking and award projections

| Module | Commands |
|---|---|
| `player/projections` | worker: `runProjectionJobs` (SKIP LOCKED claim, bounded attempts with backoff, redacted error codes, then `settleFinalization`), `releaseStaleJobs`, `retryProjectionJob`, `scheduleAgeingJobs`, `schedulePolicyRecalculation`; `recomputeRank`; club `confirmHistoryAttribution`; public `readPlayerMatchHistory`, `readPlayerRank`, `readLeaderboard` |

- Jobs are unique per source + kind + version, so a retried finalization, assessment or attribution contributes once; contributions are also de-duplicated per (match, entry).
- Only full participation in singles/doubles counts. Invalid sessions have no facts; partial and fun games appear in history with their status but never count.
- The window uses each game's original played date, so ageing changes eligibility with no new games; `next_recheck_at` is when the oldest counted game leaves the window.
- **No rank formula is approved (#247).** `APPROVED_RANK_ALGORITHMS` is empty, so rank rows hold evidence counts and window only: numeric rank, level and components stay null (`formula_pending`), and the leaderboard is empty. Missing evidence is never a zero rank.
- Awards in the private snapshot use the prototype reference formula from `@rotra/data` and are labeled `prototype-reference`; Off Day is stored in its own column.
- Confirmed guest history needs the club player already linked to that profile plus an identity method (RTR ID, QR or phone); facts keep their original snapshot. Revocation is not built here.
- Worker hosting and schedule are open (#243); these are plain functions to call from it.

## F07.31 · Private results, explicit publication

| Module | Commands |
|---|---|
| `queue/results` | `readSessionResults` (club-only snapshot, publication and exports); `publishResults` (Publish and Publish again); `readPublishedResults` (used by `readPublicSession`); `requestResultExport`, `exportAssetKey`, `markExportRendered` |

- Off Day is excluded unless the publish call sends `includeOffDay: true`; it is never carried over from the previous publish. Every publish appends a `session_publication_events` row and is repeat-safe on its command.
- The public copy holds names and counts only (standings: position, name, W/L, games; awards: names and prior-session counts). No IDs, scores evidence, levels, contacts, financials or raw evidence; the public page never joins the private snapshot.
- Exports are private; their ID comes from the command and the storage key from the ID, so a re-render overwrites the same object. Rendering and storage are later work; a render failure leaves the finalization and snapshot untouched.
- Unpublish, bucket policy and public asset access are not built.

## F07.32 · Expiry-cycle retention, recoverable jobs

| Module | Commands |
|---|---|
| `admin/retention` | `retainPublicationsUnderCycle` (called when `refreshEntitlement` starts a cycle); `runRetentionSweep`; `retryCachePurge`; `readRetentionSchedule` |
| `admin/licenses` | renewal cancels the exact running cycle (F07.21), so retained pages stay |
| `queue/public-session` | a deleted page reads as `not_found` (stale-page state) |

- Scope: only `session_publications` rows go to `deleted` (public copy and slide selection cleared) plus their public cache entries. Players, sessions, facts, finalizations, snapshots, exports and earned history are never touched. No private-data purge is inferred.
- Each due cycle is swept in its own transaction under the club lock, rechecking that the cycle is still `running`, past its deadline, and the club still has no access; the SQL guard checks the cycle again. A sweep queued before renewal finds the cycle cancelled and exits.
- Cache purge runs after commit with bounded retries (`MAX_SWEEP_ATTEMPTS`); a failure is reported in the diagnostics and `retryCachePurge` repeats it safely. Diagnostics carry IDs, counts and codes only.

### Worker runbook (proposal; runtime pending #243)

1. Every 15 minutes: `refreshLapsedEntitlements()` → `scheduleAgeingJobs()` → `releaseStaleJobs()` → `runProjectionJobs()` until it returns nothing.
2. Daily: `runRetentionSweep(cache)`. Alert on any `failed` diagnostic or `cachePurged: false`.
3. A projection job that reached `MAX_JOB_ATTEMPTS` stays `failed` and the finalization shows `failed` with the stage; fix the cause, then `retryProjectionJob(id)`. Canonical facts are never re-run.
4. Restore rehearsal: restore a nonproduction dump, run `scripts/disposable-db.sh` checks, then run step 1 once; jobs are idempotent, so a restored backlog replays safely. Never run the sweep against a restored copy that points at production storage or caches.

## F07.34 · First persisted preparation journey

Wired end to end in real data mode (see [architecture.md](../../architecture.md) › Server boundary):

| Step | Route Handler | Service |
|---|---|---|
| Owner and club sign-in | `POST /api/auth/sign-in`, `GET /api/auth/session`, `POST /api/auth/sign-out` (both apps) | `auth/sign-in` |
| A-CLUBS, A-CLUB-DETAIL | Admin `GET /api/clubs`, `GET /api/clubs/[clubId]`, `GET /api/clubs/identity` | `readAdminClubDirectory`, `readClubIdentityIndex` |
| A-ADD-CLUB | Admin `POST /api/clubs` | `findLocationCode` → `stageClub` → `provisionClubAccount` with `auth/supabase-provider-admin` |
| A-LICENSE | Admin `POST /api/clubs/[clubId]/licenses`, `GET /api/license-operations/[commandId]` | `activateLicense`, `readLicenseOperation` |
| Q-ACCESS, Q-CLUB | Queue `GET /api/license`, `GET /api/club` | `readOwnLicense`, `readClubSettings` |
| Q-VENUES | Queue `GET`/`POST /api/venues` (create only) | `readVenues`, `saveVenue` |
| Q-HOME, Q-SETUP | Queue `GET`/`POST /api/sessions`, `GET /api/sessions/[sessionId]` | `readQueueSessions`, `readQueueSession`, `createQueueSession`, `saveSessionCost` |
| Q-ROSTER | Queue `GET`/`POST /api/sessions/[sessionId]/roster`, `POST …/roster/[rosterId]/level` | `readSessionRoster`, `addNewPlayerToSession`, `setRosterLevel` |

Verification (#275, closed November 1, 2026 by the product owner):

- **Verified** against hosted Supabase over HTTP (PR #318): signed-out session reads, 401 with safe copy for
  wrong credentials, 422 for empty forms, 401 on every protected `/api` route, login redirects, a forged
  mock cookie refused and cleared, and `Cache-Control: private, no-store` with `Vary: Cookie`.
- **Not verified:** the signed-in journey (add/activate club → club sign-in → venue → Queue Session → guest →
  level → fresh-browser reload), direct cross-club requests, the screens at 375/1280 in both themes, and the
  `@clubs.rotra.invalid` login with Supabase `createUser`. Tracked in #389.

Proposals used, each now its own ticket (split from #317): club username →
`<username>@clubs.rotra.invalid` provider login (#381); the six prototype founding cities seeded by
`20261101000100_seed_founding_locations` (#380); license start decided by the server and the typed
reference kept as the note (#377). The remaining gaps are listed in the
[database open-decisions register](open-decisions.md#gaps-from-the-f0734-wiring).

## Admin player directory reads (2026-11-01)

Admin `GET /api/players` calls `admin/players.readAdminPlayerDirectory` behind
`handleAccountRequest('admin', …)`. It returns an allowlisted private projection of identities with
allocated RTR IDs: current contacts, account state, memberships, allocation city/date, and the stored
shared-rank projection. No rank is synthesized from club levels or fixture data. Responses are
private/no-store; public and Queue player searches do not use this endpoint.

`@rotra/data` branches to this transport in real mode for list, detail, and selected-ID reads.
The existing directory selector preserves search, duplicate groups, counts, URL filters, pagination,
and contact-free CSV export. Like the first Admin club directory, it loads the directory then filters
in the client; server-side filtering/pagination remains a scaling follow-up.

Admin `GET /api/players/[playerId]/games` authorizes the owner, checks the allocated identity, and
uses the canonical read-only match-history projection for quick view and full history.

Player mutations (Add, Edit, Archive, Restore, Remove and registration links), contact-request reads,
audit reads, and ranking-settings reads remain unwired in real mode. The player schema has no archive
column yet, so persisted directory rows are active and removal is explicitly unavailable. These reads
do not apply migrations, create players, or change contacts, permissions or retained results.
