# Plan: Public reads in Go

**Track ID:** go-public-reads_20261113 · **Spec:** [spec.md](./spec.md)

Ticket: #874 (one issue for the whole track, under epic #869).

## Phase 1: Player public

- [x] **1.1** Characterize + port leaderboard and search (`GET /api/leaderboard`, `/api/leaderboard/search`; 77 golden cases captured from the real TypeScript; shared 300/min per-IP limiter)
- [x] **1.2** Public player pages and RTR IDs (`GET /api/players/{id}`, `/rank`, `/games`, `/clubs`, `/api/rtr-ids/{rtrId}`; 91 golden cases from the real TypeScript; `/compare` and `/stats` not served)
- [x] **1.3** Club page, banners, characters, ranking settings (`GET /api/clubs/{id}` for the signed-out view only, `/api/profile-banners/shown`, `/api/profile-characters/shown`, `/api/profile-characters/{id}/image`, `/api/ranking-settings`; 287 golden cases from the real TypeScript)

## Phase 2: Public session

- [x] **2.1** Characterize public session reads (48 golden cases from the real Queue Route Handler)
- [x] **2.2** Snapshot cache (tests: TTL, two versions, concurrent refresh = one read; stdlib only, bounded 2048 entries / 64 MiB, only 200 bodies stored)
- [x] **2.3** Port the routes (`GET /api/public-sessions/{slug}`, visitor view; `/my-request` and `/join-request` answer 404 in Go and stay on Next)

## Phase 3: Switch

- [ ] **3.1** The pages that read these services directly (club page and members, register, Queue public session page and its preview) read through Go instead (B-51); add this track's `/api/*` prefixes to the `ROTRA_GO_MOVED_AREAS` list (local now; the beta project gets the full list in staging-verification; remove a prefix to undo, the Route Handler stays until ship); manual check locally; record what was verified

## Deviations log

| Date | Task | Deviation | Reason | Resolution |
|---|---|---|---|---|
| 2026-11-17 | 1.1 | Go returns an empty page for `offset=2^53`; TS returns page 1 | Prisma turns that skip into 0 | Pinned in `knownDeviations`; one branch to match TS if the owner prefers |
| 2026-11-17 | 1.1 | Masked (`always_private`) leaderboard rows still carry the real `playingLevel`, id and picture, hidden only by `levelHidden` | Characterized from the current TS (D-2026-11-09-07 hides name and level in the UI) | Ported as is; owner decision whether the level should leave the API |
| 2026-11-17 | 1.1 | Production returns the empty state until a rank formula is approved (#247); `Deps.ApprovedAlgorithms` is empty in `cmd/api` | TS gate `APPROVED_RANK_ALGORITHMS` is empty | Mirrored; Go must be updated when #247 lands |
| 2026-11-17 | 1.1 | `stream_test.go` errcheck findings from #885 fixed | Backend CI lint never ran on #885 (mixed PR skipped the `go` job) | Fixed here; `golangci-lint` v2.15.0 reports 0 issues |
| 2026-11-17 | 1.2 | **Owner decision (privacy):** `GET /api/rtr-ids/{rtrId}` returns the player id for private, always-private and hidden-from-directory players; only unknown or malformed IDs give 404 | Characterized from the current TS; the brief expected a neutral not-found for private IDs | Ported as is; decide whether private RTR IDs should 404 |
| 2026-11-17 | 1.2 | **Owner decision (privacy):** `hidden_from_directory` and visibility `private` do not affect direct profile reads (full profile returned); only `always_private` masks | Characterized | Ported as is |
| 2026-11-17 | 1.2 | **Owner decision (privacy):** `/rank` returns the real name and nickname of always-private players, and exposes any stored `levelIndex` without the approved-algorithm gate | Characterized (no rank math in the TS) | Ported as is |
| 2026-11-17 | 1.2 | **Owner decision (privacy):** `/games` is public, unpaged and unscoped: an always-private player's whole history is listed; `maskAlwaysPrivate=false` does not unmask | Characterized | Ported as is |
| 2026-11-17 | 3.1 | `/api/players` and `/api/rtr-ids` cannot be listed in `ROTRA_GO_MOVED_AREAS` (they also catch signed-in `/compare` and `/stats`, which Go answers 404) | Prefix-only matching | Switch only the safe prefixes now (owner decision 2026-11-17); the rest move with go-signed-in-reads or a matcher change |
| 2026-11-17 | 1.2 | Unverified: Go and the capture both percent-decode path params; matches only if Next 16 passes handlers decoded params | Edge cases (padded, NUL, encoded slash ids) | Plain UUIDs and RTR IDs unaffected; check in staging-verification |
| 2026-11-17 | 1.3 | Go serves the club page for a signed-out viewer only; Player's viewer-aware variant stays on its Route Handler until go-sign-in | Go cannot verify a sign-in yet (B-24/B-32) | `/api/clubs` can be listed for Queue only |
| 2026-11-17 | 1.3 | **Owner decision (dependency):** `golang.org/x/text` moved from indirect to direct in `go.mod` (collation for `localeCompare` member order, matched to Node ICU on a 400-name corpus) | The TS sorts members with `localeCompare` | Same module and version already in `go.sum`; alternative is a hand-rolled comparator |
| 2026-11-17 | 1.3 | **Owner decision (privacy):** the club page returns the club's `inviteCode` to anonymous callers; masked members still expose level, picture, banner and the stable member `key` | Characterized from the TS | Ported as is |
| 2026-11-17 | 1.3 | Ranking settings are served publicly while the algorithm version is `unapproved` (no gate in the TS, no rank math) | Characterized | Ported as is |
| 2026-11-17 | 1.3 | **Owner decision (limits):** the image route shares the 300/min public-read budget (the TS has no limit); a club member grid behind one venue IP could use it up | B-43 limiter applies to all public reads | Exempt the image route or rely on CDN caching |
| 2026-11-17 | 3.1 | Admin has its own `/api/ranking-settings`, `/api/profile-banners/*`, `/api/profile-characters/*`; those prefixes must never go on Admin's moved list | Same paths, different handlers | Move list per app: Queue gets `/api/clubs`, `/api/profile-banners`, `/api/profile-characters`; Player gets `/api/profile-banners`, `/api/profile-characters`, `/api/ranking-settings`; Admin none |
| 2026-11-17 | 1.3 | `go.sum` tidied (stale `x/net v0.59.0` lines left by the earlier bump) | `go mod tidy -diff` reported it | Fixed |
| 2026-11-17 | 2.2 | Only the `visitor` view is built; the `signed_in` view is not | No TS source to characterize, and Go cannot verify a sign-in (B-24); the cache is keyed by (slug, view) and tested with a synthetic second view | Build it when sign-in moves (go-sign-in) |
| 2026-11-17 | 2.2 | Cache freshness is the 10 s TTL, not the live-update event id | The events table does not exist before live-updates (B-25) | Switch the key to the event id in live-updates |
| 2026-11-17 | 2.3 | **Owner decision (privacy):** published `results` carry full unmasked names plus `pictureUrl` and a `participant` index into the masked list, which re-identifies masked participants | Characterized from the TS | Ported as is |
| 2026-11-17 | 2.3 | **Owner decision (takedown):** an unpublished or deleted publication stays visible for up to 10 s because of the cache | TTL cache | Add an explicit invalidation hook if takedown must be instant |
| 2026-11-17 | 2.3 | The page exposes device-sync state (`lastSyncedAt`, `hasPendingChanges`); cancelled and invalid sessions still serve the masked roster with a 200 | Characterized | Ported as is |
| 2026-11-17 | 3.1 | `/api/public-sessions` cannot be listed for Queue: it also catches `/my-request` and `/join-request`, which Go answers 404 | Prefix-only matching | Not switched (owner decision 2026-11-17); the Queue public session page can still read through Go server-side |
| 2026-11-17 | 2.3 | Go answers the 404 envelope for a NUL-byte slug (TS: 500) and for invalid percent-encoding (Next: 400) | `validSlug` runs before the cache and database | Pinned in tests |
