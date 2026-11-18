# Real-mode gap tickets (DRAFT, not on GitHub)

**Drafted:** 2026-11-11 from a code trace of `main` @ `aaeaefe9`. Nothing was run against a database.
**Proposed home:** sub-issues of the open epic **#241** (`Epic F07 · Foundation › Database`), so no new
epic is needed. Labels: `ticket` + the product label. Seq starts at **392**, keys at **F07.51**.

Every ticket shares these rules unless it says otherwise:

- Follow the shape of the existing adapters: `packages/data/src/<domain>` fetcher → `packages/data/src/real/*.ts`
  → `apps/<app>/…/api/**/route.ts` (via `handleAccountRequest`) → `packages/db/src` service.
- Keep hook and UI contracts unchanged. Mock mode must keep working.
- **Migration** = adds Prisma columns/tables under `packages/db/prisma/schema/<product>/` and a migration
  folder. AGENTS.md rule 14: the owner signs off before a migration is applied.
- Verification: `make check` passes; then, in real mode, the named screen works end to end, with no
  "isn't connected to saved data yet" error.

Not drafted, because a ticket already exists: offline download/outbox (#477, #246), scheduled jobs
(#545–#547), club accent (#395), rank formula and leaderboard (#247), Generate-matches drafts (by design).

---

## Group A — no migration (services exist or the change is small)

### 392 · F07.51 · Chore: Club name change and session defaults in real mode
**Product:** queue · **Depends on:** none
- **Gap:** `requestClubNameChange`, `cancelClubNameChange`, `updateSessionDefaults` in
  `packages/data/src/club/settings.ts:82,88,103` have no real branch.
- **Scope:** pass the name request and the defaults fields through `PATCH api/club` to the existing
  `requestClubNameChange` / `updateClubSettings` services; add the real adapters.
- **Acceptance:** Q-CLUB name request, cancel, and Session defaults save and reload in real mode; Admin sees
  the request in its existing club-name review.

### 393 · F07.52 · Chore: Change club price in real mode
**Product:** admin · **Depends on:** none
- **Gap:** `changeClubPrice` (`packages/data/src/club/fetchers.ts:308`) is mock-only; the
  `setClubPricing` service exists with no route.
- **Scope:** Admin route over `setClubPricing` with the revision check and an audit entry; real adapter.
- **Acceptance:** A-CLUB-DETAIL price change saves; same price changes nothing; license terms untouched.

### 394 · F07.53 · Chore: Clear queue in real mode
**Product:** queue · **Depends on:** none
- **Gap:** Clear queue (`packages/data/src/match/queue.mutations.ts:273`) has no route.
- **Scope:** route + service that removes queued (not on-court, not done) matches for the session.
- **Acceptance:** Clear queue empties the queue only; courts and results are untouched.

### 395 · F07.54 · Chore: Player reset-link check reads the real request
**Product:** player · **Depends on:** none
- **Gap:** `getResetLink` (`packages/data/src/player-account/fetchers.ts:59`) always returns "valid" in
  real mode.
- **Scope:** read the #491 reset request state (valid, used, expired) from the server.
- **Acceptance:** used or expired links show their states in real mode.

### 396 · F07.55 · Chore: Audit log accepts feature-flag and ranking-settings targets
**Product:** admin · **Depends on:** none
- **Gap:** `packages/data/src/real/admin-audit.ts:12,19` still throws for these targets, citing #402
  (closed).
- **Scope:** allow the targets; drop the stale comment.
- **Acceptance:** flag and ranking-setting changes appear in the Activity log in real mode.

### 397 · F07.56 · Docs: Bring docs/mvp status up to date with the real-mode audit
**Product:** foundation · **Depends on:** none
- **Scope:** update `docs/mvp/README.md` and `workstreams/*.md`: Admin club-name review and Admin reset
  link are real; epics #10, #24, #25, #26, #408 are closed; add the Q17, P06, Clear queue and club price
  gaps; link these tickets; bump *Last verified*.

---

## Group B — Queue Q18 / Q19 (migration)

### 398 · F07.57 · Chore: Prisma schema for Q19 club settings and saved players
**Product:** queue · **Migration** · **Depends on:** owner sign-off
- **Scope:** columns for club invite code, previous logo, self check-in switch; club player Joined via,
  `linked_to_club_player_id`, club-set picture. Update `docs/database_design/product/queue/modules/sessions-roster.md`.
- **Ask first:** where club-set pictures are stored (Supabase Storage bucket and cleanup rule).

### 399 · F07.58 · Chore: Q19 club settings in real mode (invite link, previous logo, self check-in)
**Product:** queue · **Depends on:** 398
- **Gap:** `restorePreviousClubLogo`, `regenerateClubInvite`, `updateSelfCheckIn`
  (`packages/data/src/club/settings.ts:42,63,72`) throw `NotConnectedError`.
- **Acceptance:** Club settings invite (copy, regenerate), Restore previous logo, and the self check-in
  switch save and reload; Home "Share club invite" uses the saved code.

### 400 · F07.59 · Chore: Q19 saved players in real mode (Joined via, guest linking, club-set pictures)
**Product:** queue · **Depends on:** 398
- **Gap:** `club-player/linkGuest.ts:46`, `setPicture.ts:69,85,98` are not connected;
  `getJoinRequestHints` (`session-roster/requestDecisions.ts:90`) returns `{}`; `getClubPlayers` has no
  `joinedVia`.
- **Acceptance:** Joined via shows; Link to saved player… links and never auto-links; club-set picture
  upload and remove work.

### 401 · F07.60 · Chore: Prisma schema for Q18 match requests, drop-out notices and request formats
**Product:** queue · **Migration** · **Depends on:** owner sign-off
- **Scope:** match request table, drop-out notice table, join-request link column, `requestFormats` on the
  Queue Session. Update `docs/database_design/product/queue/modules/matches-queue.md`.

### 402 · F07.61 · Chore: Q18 Queue Master Requests in real mode
**Product:** queue · **Depends on:** 401
- **Gap:** `getSessionRequests` (`match-request/fetchers.ts:229`), `addMatchRequestToQueue`,
  `declineMatchRequest` (`match/matchRequestDecisions.ts:63,100`), `keepDropOut`, `removeDropOut`,
  `linkJoinRequest`, `dismissJoinRequestLink` (`session-roster/requestDecisions.ts:112–213`);
  `requestFormats` on create/update/get Queue Session.
- **Acceptance:** Requests · N tabs list, add to queue, decline, keep/remove drop-outs, link join requests;
  request formats save with the session.

---

## Group C — Player side of the Queue Session (Q17)

### 403 · F07.62 · Chore: Signed-in session page reads in real mode
**Product:** queue, player · **Depends on:** 401
- **Gap:** `getSignedInSession`, `getMyNight`, `getMatchRequestOptions`
  (`public-session/fetchers.ts:384,424,541`) have no route.
- **Acceptance:** a signed-in Player sees their night and match request options on the session page.

### 404 · F07.63 · Chore: Signed-in Player writes in real mode
**Product:** queue, player · **Depends on:** 398, 401, 403
- **Gap:** `selfCheckIn`, `leaveSession`, `sendDropOutNotice`, `getSessionInviteCode`
  (`public-session/playerMutations.ts:140–219`); `sendMatchRequest`, `cancelMatchRequest`
  (`match-request/fetchers.ts:50,99`).
- **Acceptance:** self check-in (only when the club allows it), leave, drop-out notice, send/cancel a match
  request all reach the Queue Master's Requests in real mode.

---

## Group D — Player Information P06

### 405 · F07.64 · Chore: Your clubs, Join club and Leave club in real mode
**Product:** player · **Depends on:** none
- **Gap:** `packages/data/src/player-club/fetchers.ts:15,38,70` throw `NotConnectedError`.
- **Scope:** routes over `club_players.player_id` membership.
- **Ask first:** whether Leave club keeps the club player row (history) or marks it removed.

### 406 · F07.65 · Chore: My sessions and share-card data in real mode
**Product:** player · **Depends on:** none
- **Gap:** `player/mySessions.ts:28`, `player/shareData.ts:22` have no routes.
- **Acceptance:** My sessions lists retained sessions; share cards render from saved results.

### 407 · F07.66 · Chore: Private profile, email confirmation and claim status in real mode
**Product:** player · **Migration** (privacy column) · **Depends on:** owner sign-off
- **Gap:** `useSetProfilePrivacy.ts:13`, `emailConfirmation.ts:9`, `checkClaimStatus`
  (`player-account/fetchers.ts:215`).
- **Ask first (auth):** email confirmation reads the Supabase user's confirmed state, or a ROTRA column?

---

## Group E — Admin players and profile characters (A07)

### 408 · F07.67 · Chore: Profile character library table and storage
**Product:** admin, player · **Migration** · **Depends on:** owner sign-off
- **Scope:** `profile_characters` table, storage bucket; seed the current a–g characters
  (now hardcoded in `packages/db/src/player/avatar.ts:12`).

### 409 · F07.68 · Chore: Profile character library in real mode (Admin and Player picker)
**Product:** admin, player · **Depends on:** 408
- **Gap:** `profile-character/fetchers.ts:31,41,74,128,158,185`; `profileCharacterImage` (`:47`) reads
  fixture images even in real mode.
- **Acceptance:** Admin Settings › Profile characters add/edit/retire work; the Player picker pages through
  saved characters; picture references resolve from saved data.

### 410 · F07.69 · Chore: Admin edits everything on a player in real mode
**Product:** admin · **Depends on:** 409 (picture section)
- **Gap:** `updateAdminPlayer` (`admin-player/mutations.ts:239`) saves only name and nickname;
  `getAdminPlayerEdit` (`fetchers.ts:144`) partial.
- **Scope:** full-form PATCH with revision check and reason in the audit log.
- **Ask first (auth, contacts):** admin-set password in real mode (A07 calls it beta-only); contact fields
  must keep going through the contact-change flow (#575)?

### 411 · F07.70 · Chore: Admin player create, archive, restore and remove in real mode
**Product:** admin · **Migration** (archive column on `Player`) · **Depends on:** owner sign-off
- **Gap:** `createAdminPlayer`, `changeAdminPlayers` (`admin-player/mutations.ts:53,351–410`).
- **Ask first:** remove = hard delete or retention-bound soft delete (#248)?

### 412 · F07.71 · Chore: Admin registration link and registration without a club in real mode
**Product:** admin, player · **Depends on:** 411
- **Gap:** `issueRegistrationLink` (`admin-player/mutations.ts:415`); `guestRegistration.ts:28,60` is real
  only with a clubId.
- **Ask first:** is the Admin registration link MVP (docs/mvp open question 9)?

---

## Group F — Decisions to settle first

### 413 · F07.72 · Decision: Club password change in real mode
**Product:** queue · Club password lives with the sign-in provider (`changeClubPassword`,
`club/settings.ts:145`). Decide: MVP or not, and whether it re-authenticates with the current password.

### 414 · F07.73 · Decision: Server-rendered result-image export
**Product:** queue · `requestResultExport` / `markExportRendered` have no route. Same as docs/mvp open
question 4: keep the client-side download only, or build the export route?
