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
