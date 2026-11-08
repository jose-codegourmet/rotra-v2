# Workstream — Admin

**Last verified:** 2026-11-08 (code trace of `main` @ `aca899f2`; no Admin code changed since `51abb94f`; traced, not run) · [MVP hub](../README.md)

Paths: `real/` = `packages/data/src/real/`, `api/` = `apps/admin/src/app/api/`, `db/` = `packages/db/`.

## Goal

Admin manages clubs and access.

## In scope

Admin sign-in; clubs, licenses, pricing and club-name requests; player directory and history;
configuration (feature flags, ranking settings); audit; contact-change review; the manual player reset
link ([D-2026-11-07-01](../decisions.md#d-2026-11-07-01)).

## Out of scope / deferred

- Club accent persistence: lower priority / defer candidate (#395, blocked on a data-model decision).
- Rank calculation itself → [ranking.md](ranking.md).

## Current state

| Capability | Status | Evidence | Tickets |
|---|---|---|---|
| Sign-in / session / sign-out | implemented | `admin-account/fetchers.ts:25,30,46` → `real/admin.ts:206-218` → `api/auth/{session,sign-in,sign-out}` → `db/src/auth/sign-in.ts:57,90,105` | #351 closed |
| Clubs list / detail / identity index | implemented | `club/fetchers.ts:140,162,207` → `real/admin.ts:112,131,163` → `db/src/admin/clubs.ts:260,274,344` | #24 open (epic) |
| Add club | implemented | `club/fetchers.ts:234` → `api/clubs/route.ts:25` → `stageClub` (`clubs.ts:108`) | — |
| License activate / terms / operation status | implemented | `license/fetchers.ts:110,140,205` → `real/admin.ts:175-198` → `db/src/admin/licenses.ts:110,188,199` | #377 open (decision) |
| Scheduled license-lapse refresh, retention sweep | not implemented | `refreshLapsedEntitlements` (`licenses.ts:221`), `runRetentionSweep` (`retention.ts:97`) have no caller | Ticket: needed (MVP scope: open question 13) |
| Change club price | not implemented | `club/fetchers.ts:306` mock only; `setClubPricing` (`clubs.ts:211`) has no route | Ticket: needed |
| Club-name requests (list/approve/reject) | not implemented | `club/fetchers.ts:350,376,400` mock only; `reviewClubNameChange` (`clubs.ts:502`) has no route | Ticket: needed |
| Player directory / detail / games | implemented | `admin-player/fetchers.ts:89,103,136,147` → `real/admin-players.ts` → `db/src/admin/players.ts:13,106` | #25 open (epic) |
| Player edit profile (name + nickname) | implemented (#575) | `admin-player/mutations.ts` → `real/admin-players.ts` → `PATCH api/players/[playerId]` → `updateAdminPlayerProfile` (`db/src/admin/players.ts`); audit `player.profile_updated`; unclaimed photo link mock-only | #575 |
| Player create/archive/restore/remove (Edit profile also sends an email change as an `owner` contact-change request, #564) | not implemented | `admin-player/mutations.ts` mock only | Ticket: needed (MVP scope: open question 10) |
| Feature flags | implemented | `real/configuration.ts:77-108` → `api/feature-flags{,/[key]}` → `db/src/admin/configuration.ts:62,95,154` | #402 closed, #26 open |
| Ranking settings (read/save versions) | implemented | `real/configuration.ts:123-157` → `api/ranking-settings` → `configuration.ts:72,190`; saving does not recalculate | #402 closed |
| Audit log (club, player, contact request) | implemented | `real/admin-audit.ts:13-21` → `api/audit-events` → `db/src/admin/audit.ts:105`; shown inside detail pages | #401 closed |
| Audit log (flags, ranking settings) | partially connected | Written by `configuration.ts`; reads exclude them (`real/admin-audit.ts:13`, `AuditReadTarget` `audit.ts:47`) | Ticket: needed |
| Contact-change reads + decline | implemented | `real/contact-change.ts:167-217` → `api/contact-change-requests/**` → `db/src/player/contact-change.ts:245,332` | #401 closed |
| Contact-change approve / apply / retry / status | implemented (#575) | `real/contact-change.ts` → `POST api/contact-change-requests/[requestId]/approve\|retry\|check` → `reviewContactChange`, `applyContactChange`, `reconcileContactChange` (`db/src/player/contact-change.ts`) with the Supabase admin adapter; gap: no audit line for a failed or retried application | #575; approval evidence still open in #244 |
| Admin-reviewed player reset link | implemented in #491; schema applied | `/requests/password-resets`, protected API, request table + audit, provider recovery token | #491 |
| Registration link from a player's Admin profile | not implemented | `admin-player/mutations.ts:229` `issueRegistrationLink` mock only (Queue issuance is real since #483, see [player.md](player.md)) | none found; MVP scope: hub open question 9 |
| Club accent persistence | not implemented / deferred candidate | `real/admin.ts:88-89` hardcodes `accent: false`; no `accent` in `prisma/schema` | #395 open (blocked) |

## Admin implementation gap index

Moved from the MVP decision register; updated with the 2026-11-07 audit. This is an inventory, **not**
a claim that each gap has a dedicated implementation ticket.

| Gap | Decision / implementation state | Ticket coverage | MVP relevance |
| --- | --- | --- | --- |
| Contact-change approve, retry, status | Implemented in real mode (#575); approval evidence and audit lines for failed/retried application open | [#244](https://github.com/jose-codegourmet/rotra-v2/issues/244) and [Admin requests epic #25](https://github.com/jose-codegourmet/rotra-v2/issues/25); audit found **no dedicated implementation ticket** | MVP |
| Admin-reviewed player reset link | Owner-approved #491; implemented and locally verified; shared schema applied | #491; D-2026-11-07-01 | MVP |
| Ranking calculations from saved settings | Settings persist; calculations incomplete (audit: no approved algorithm, recalculation has no caller) | [#247](https://github.com/jose-codegourmet/rotra-v2/issues/247) and [Admin configuration epic #26](https://github.com/jose-codegourmet/rotra-v2/issues/26) | MVP scope under ranking decision |
| Club accent persistence | Open product/data-model decision; not completed | [#395](https://github.com/jose-codegourmet/rotra-v2/issues/395) | Lower priority / defer candidate |

Before agents implement, verify current `main` and the relevant ticket's actual scope. Do not create
duplicate issues merely because a related epic is open.

## Remaining work

- [ ] Contact-change approve / apply / retry / status Route Handlers over existing services. Ticket: needed (after #244 enforcement answers).
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] Club price change and club-name review routes. Ticket: needed.
- [ ] Admin player write routes (create/edit/archive/restore/remove/registration link). Ticket: needed — confirm MVP scope.
- [ ] Audit reads for feature flags and ranking settings. Ticket: needed.
- [ ] Scheduled license-lapse refresh and retention sweep runner. Ticket: needed — confirm MVP scope.
- [ ] Club accent. Ticket: #395 (open, blocked).

## Related decisions

- [D-2026-11-07-01](../decisions.md#d-2026-11-07-01) — Admin issues the manual reset link.
- [D-2026-11-07-04](../decisions.md#d-2026-11-07-04) — scope freeze.

## Blocking open decisions

- #244 contact-change approval evidence and audit lines for failed or retried application (application itself is real, #575); #395 accent data model; #377 license start date/reference; #380 founding locations.
- [Database open decisions](../../database_design/product/open-decisions.md) · [business open decisions](../../business_logic/product/open-decisions.md) · [screen open decisions](../../screens/product/open-decisions.md).
- Hub open questions 9, 10, 13, 14.

## Exit criteria

**Proposed — owner to confirm.**

- [ ] In real mode, the Admin manages clubs, licenses and the player directory.
- [ ] Contact-change requests can be approved, applied and checked, not only declined.
- [ ] Admin-reviewed password recovery (#491) is verified with the hosted provider (schema applied after sign-off).
- [ ] Every gap in the index above has a ticket or an owner ruling.
