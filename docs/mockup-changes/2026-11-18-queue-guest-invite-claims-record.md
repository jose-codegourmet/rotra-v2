# Queue app: a guest's invite link is their own, and registering through it claims that guest's record

Status: IN PROGRESS — #966
Date: 2026-11-18
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheets `profile` (Invite to ROTRA, guests) and `invite`; `playerInviteLink()` (new); actions `copyGuestInvite`, `shareGuestInvite`
Route: /queue/players (Saved players › a guest › Invite); /queue/sessions/s-tonight/preparation?tab=roster (a guest's picture › Invite to ROTRA)
Screen ID: Q-SAVED-PLAYERS, Q-ROSTER
Artifact: none
Components: player-profile-sheet, invite-sheet, claim-identity-check
Supersedes: none (it changes the guest invite text of 2026-11-16-queue-unclaimed-email-lookup and the guest link of 2026-11-07-queue-guest-invite-link; the rest of those logs stands)
Superseded by: none

## What changed
- **Guest profile dialog › Invite to ROTRA.** The text was "Send this link so they can register for ROTRA
  Player. Games they played here as a guest don't follow them. To keep those games, add their email in
  Edit details first." It is now "Send this link so they can register for ROTRA Player. This record
  becomes theirs when they register: their games here stay with them. The link works once and lasts 7
  days."
- **Copy invite link** and **Share** on that dialog no longer use the club invite link
  (`/register/<clubId>`). They use the guest's own registration link (`/claim/<code>`), the kind an
  unclaimed player already gets.
- **Invite dialog for a guest** (Saved players › Invite). The link is the guest's own registration link
  too. The last paragraph was "Games they played here as a guest don't follow them. To keep those games,
  add their email in Edit details first. The link only sets up their account. …" and now starts "This
  record becomes theirs when they register: their games here stay with them." The hint under the link,
  "Works once and lasts 7 days. Opening Invite again makes a new link and cancels this one.", now shows
  for a guest as well as an unclaimed player.
- Nothing else on the dialogs moved. The club invite link in Club settings and the invite card are unchanged.

## Why
- In the real app a guest who registered through the copied link got a second club player record; the
  guest's own record, games and session slots stayed behind.
- Owner, November 18, 2026: "As a QM, I created an Account for them, that guest account was intended for
  them until they feel ready to use that account. So if they enter their details. and they register. That
  ACCOUNT WAS FOR THEM".
- Decision: [D-2026-11-18-07](../mvp/decisions/2026-11-18.md#d-2026-11-18-07). The link is the proof; nobody is
  merged by name alone.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: guest profile with Invite to ROTRA (default; Share only when the browser can share); the Invite
  dialog for a guest and for an unclaimed player (default, offline). In the app only: Copy invite link and
  Share show the button's loading state while the link is made, and a link that can't be made is an error
  toast.
- Copy:
  - "Send this link so they can register for ROTRA Player. This record becomes theirs when they register:
    their games here stay with them. The link works once and lasts 7 days."
  - "This record becomes theirs when they register: their games here stay with them." (Invite dialog, guest)
  - "Works once and lasts 7 days. Opening Invite again makes a new link and cancels this one." (unchanged
    words, now also for a guest)
- Tokens: none
- Known differences: the mockup's hint ends "Sample link in this prototype."; the app leaves that out (as
  before). Not owner-approved separately: it is prototype-only text.

## Reuse plan
- Reuses as is: sheet, button, toaster, field, text-input.
- Extends: player-profile-sheet — `inviteUrl` is replaced by `getInviteLink` (an async getter, so the
  container makes the guest's link on the first tap); new text.
- Extends: invite-sheet — new guest text; the 7-day hint.
- Extends: claim-identity-check (Player app) — the Email row is left out when the record has no email,
  which is every guest record. The Player prototype has no sample for this.
- New: none
- Shares work with: 2026-11-18-queue-club-nickname (player-profile-sheet)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — a guest's invite link is
  their own and claims the record; how guest games join an account.
  docs/business_logic/product/player-information/modules/identity/README.md — the Guest row and the
  November 16 note on guest registration.
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — a guest record can
  have a `club_player_claim_links` row; registration sets `club_players.player_id` on the same row. No
  new table or column, no migration.
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Invite to ROTRA and the Invite
  dialog. docs/screens/product/modules/player-information/access-registration.md — P-CLAIM for a guest's
  record.
- Also: docs/product-terms.md (Guest, Invite), docs/mvp/decisions/README.md (D-2026-11-18-07, amendment note on
  D-2026-11-16-04), docs/mvp/workstreams/player.md (claim-link issuance row).

## Real app work
- Built in the same change, without a ticket: `@rotra/ui` player-profile-sheet, invite-sheet and
  claim-identity-check; `PreparationRoster` passes `getInviteLink`; `createPlayerInvite` (mock and real)
  makes the guest's own link; `issueClaimLink` (`packages/db/src/player/claim.ts`) issues a link for a
  record with a name only. Mock mode copies a sample `/claim/<code>` link, as it does for an unclaimed
  player.
