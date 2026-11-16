# Admin › Players: unclaimed players have an email and an RTR ID; Admin can change the email and the RTR ID

Status: NEW
Date: 2026-11-16
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players (list, quick view, Edit profile) and the player page (Overview)
Route: /admin/players (click a row, then Edit); /admin/players/<id>
Screen ID: A-PLAYERS, A-PLAYER-DETAIL, A-PLAYER-EDIT
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: admin-player-card, admin-player-filters, admin-player-quick-view, admin-player-clubs, admin-player-identity-card, admin-edit-player-form, player-account-chip, rank-status-chip, confirm-sheet, change-compare
Supersedes: none
Superseded by: none

## What changed
- **Unclaimed players have an email.** Before, a player counted as registered when they had an email, and
  unclaimed rows had none. Now a player is registered only when they have a registration date, and every
  unclaimed sample player has an email and an RTR ID.
- **Details required.** Two older sample records (Joanna Tan, and one generated record) keep a phone and
  no email. They show a warning chip **Details required** next to Unclaimed in the list, the grid, the
  quick view and the player page, and a notice in the quick view and on the player page's Account card
  saying the club must add an email or delete the record. The account switch in the toolbar gets a fourth
  option, **Details required**, that lists only these.
- **More than one club.** Nina Ocampo is saved by Talamban Racket Club (as “Nina Ocampo”) and IT Park
  Badminton Club (as “Nina O.”). Her row's club line reads “Talamban Racket Club and 1 more club”. The
  quick view (a new **Created by** row, only for such players), the Edit profile read-only block and the
  player page's Identity card list each club with that club's name for her, plus a line that she is not
  on the leaderboard until she registers. Her rank chip is **Not on leaderboard**.
- **Admin can change the RTR ID.** Before, Edit profile showed the RTR ID read-only with “The RTR ID never
  changes.” Now the Account section has **Registration place** (the founding-city list) and
  **Registration date**, and the RTR ID under them is a live preview that follows both and keeps its
  number at the end. It is not typed by hand.
- **Changing the RTR ID asks first.** Save changes with a changed place or date opens **Change RTR ID?**
  (Current → New) before anything is saved. **Back** returns to the panel with everything typed kept.
- **The email is editable for unclaimed players** (it already was a field; the hint and the validation now
  say so, and an unclaimed player who has an email can't be saved without one).
- Strings that became untrue were fixed: “· permanent RTR IDs” under the Players heading is gone, and the
  player page's “The RTR ID never changes, including after a contact change.” is replaced.
- A saved prototype state from before this change gets the sample players again.
- Search is unchanged: name, RTR ID, phone or email.

## Why
- [D-2026-11-16-04](../mvp/decisions.md#d-2026-11-16-04), approved by the owner on November 16, 2026:
  an unclaimed player needs an email and gets an RTR ID; one email is one person and one RTR ID; “Admin
  can edit the email and the RTR ID”; a changed RTR ID cascades.
- Owner, on older records with a phone and no email: “it should just show a tag called .. details required
  or needs attention”.
- Owner, on a changed RTR ID: “it should cascade to editing all of them”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: list and grid rows (registered; unclaimed; unclaimed with Details required; unclaimed saved by
  two clubs); account switch on Details required, and its empty result; quick view for each of those;
  Edit profile for a registered player, an unclaimed player, a Details required record; RTR ID preview
  before and after changing the place or date; date missing (error); RTR ID already used by another
  player (error); the Change RTR ID? confirmation; Back from it; saved (toast and Activity entry).
- Copy:
  - Chip: “Details required” (warning style). Account switch option: “Details required”.
  - Notice: “**Details required.** This older record has a phone and no email. <Club> must add an email or
    delete the record.”
  - Row club line: “<First club> and 1 more club” (“and N more clubs” for more).
  - Club line: “<Club> · saved as **<name>**”. Under it: “Saved by more than one club. Not on the
    leaderboard until they register.”
  - Rank chip: “Not on leaderboard”. Rank text: “<Level> · not on the leaderboard until they register”.
  - Players heading line: “N players” (was “N players · permanent RTR IDs”).
  - Edit profile, Account hint, unclaimed: “The club entered these and can't change the email. You can.
    The player hasn't registered yet.” Details required: “Details required: this older record has no
    email. The club must add one or delete the record. You can add it here.”
  - Fields: “Registration place” (options like “Cebu City · PH-CEB”), “Registration date”. Preview label:
    “RTR ID”. Hint: “The RTR ID follows the registration place and date, and keeps its number at the end.
    It isn't typed by hand.”
  - Read-only note: “These stay read-only. Rank, level and match history come from finished club sessions,
    and Admin can't change ranks, winners or scores. A profile becomes registered only when the player
    claims it.”
  - Errors: “An unclaimed player needs an email. Enter one.”, “Enter the registration date.”, “Another
    player already has this RTR ID. Choose another place or date.”
  - Confirmation: title “Change RTR ID?”; labels “Current” and “New”; “The old RTR ID is replaced with the
    new one on every record that holds it, in every club that saved <name>.”; “QR codes and links the
    player already shared with the old RTR ID may stop working.”; buttons “Back” and “Change RTR ID”.
  - Activity entry: “Edited <name>: RTR ID. RTR ID <old> replaced with <new> on every record. Reason: …”.
    Toast: “Saved <name>: RTR ID.”
  - Player page, Identity: “A contact change doesn't change the RTR ID. Admin can change it from Edit
    profile, by changing the registration place or date.”
  - Old fallback sheet: “Review before and after values before saving. Rank cannot be edited.”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: chip / player-account-chip — the Details required chip is the existing warning chip;
  notice — the Details required notice; confirm-sheet and change-compare — the Change RTR ID?
  confirmation; select and date-picker — the place and date fields; segmented-control — the fourth
  account option.
- Extends: admin-player-filters — a `details` account value; admin-player-card and
  admin-player-quick-view — the Details required chip and notice, and the more-than-one-club lines;
  admin-player-clubs — each club's own name for the person; admin-edit-player-form — the place and date
  fields, the RTR ID preview, the new email rule and the confirmation step; rank-status-chip — the Not on
  leaderboard state.
- New: none
- Shares work with: the Queue and Player mockup logs for D-2026-11-16-04 written the same day (unclaimed
  status, Details required tag).

## Docs updated
- Business logic: none in this change — the business docs for D-2026-11-16-04 are being updated by a
  separate change the same day.
- Database design: none in this change — same as above.
- Screen docs: docs/screens/product/modules/admin/players-requests.md — A-PLAYERS (heading line, account
  switch, unclaimed players, Details required, more than one club), A-PLAYER-DETAIL (identity note) and
  A-PLAYER-EDIT (Account hints, the new RTR ID row, the read-only row, the confirmation).

## Real app work
- Admin › Players in `apps/admin` and `packages/ui`: the Details required chip, notice and filter; the
  more-than-one-club lines; the Not on leaderboard rank state; Edit profile's registration place and date
  with the live RTR ID preview, the confirmation, and the cascade of a changed RTR ID to every record that
  holds it (mock store first; the real cascade belongs to the database work for D-2026-11-16-04).
- Not designed here, still open in the decision: whether an old RTR ID in a QR code or link still leads to
  the player; the Admin “Verified by Admin” control (a separate change); whether Admin's own **Add
  player** must require an email (the old fallback sheet still says “Email (optional)”).
