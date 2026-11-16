# Queue app: unclaimed players need an email and get an RTR ID; lookup by RTR ID or email only; guest linking removed

Status: NEW
Date: 2026-11-16
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheets `add`, `profile`, `editPlayer`, `invite`, `sameEmail`, `pubProfile`; `reqRow` (join requests); the guest join form; Saved players filters; seed players and `DIRECTORY`
Route: /queue/players (Saved players, Add player, a player's Edit details); /queue/sessions/s-tonight/preparation?tab=roster (Add player, join requests); the public session page
Screen ID: Q-SAVED-PLAYERS, Q-ADD-PLAYER, Q-ROSTER
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: add-player-sheet, saved-player-card, player-profile-sheet, edit-player-form, invite-sheet, join-request-row, join-request-form, participant-profile-card, chip
Supersedes: 2026-11-11-queue-club-only-unclaimed.md (in part: RTR ID, lookup, what makes a record unclaimed)
Superseded by: none

## What changed
- **Statuses.** A **guest** is a name only. An **unclaimed** player has a required email and an RTR ID. Sample data: Jomar, Nina, Gab and Faye are unclaimed with an RTR ID; Joanna and Mika are older records with a phone and no email.
- **Details required.** An older unclaimed record with no email shows a warn chip **Details required** in place of the Unclaimed chip (saved-player card, profile, pick lists), a notice on the profile and in Edit details, and its line under the name reads "Details required". Saved players › Account filter gains **Details required**; "Unclaimed profile" in that filter is now "Unclaimed".
- **Add player › Player Information.** Exact RTR ID or exact email only. The list is empty until one matches. Another club's unclaimed player comes back as "Not registered yet" with the RTR ID and no name, picture or level; picking them asks for this club's own name for them.
- **Add player › New player.** Phone (optional) is replaced by **Email (optional)**. No email saves a guest. An email saves an unclaimed player with a new RTR ID, links a ROTRA player when the email is already on ROTRA, or waits for sync when offline. An email that is already a saved player is refused.
- **Edit details.** A guest gets **Email (optional)**; saving one makes them unclaimed. A saved email is read-only. Phone (optional) shows for unclaimed players only. An older record gets a required-looking **Email** field with the Details required notice.
- **Same person.** When the email typed for a guest already belongs to a saved player, a confirmation moves the guest's record into that player's.
- **Removed.** **Link to saved player…** on a guest's profile and its picker sheet; **Link** / **Not them** on a join request; the phone on a guest join request (form field, row text, and the "pending" status it caused).
- **Profile sheet.** New **Email** row under In your club (guests and unclaimed players). Status lines and the guest invite text reworded.
- **Invite sheet.** Reworded for email and for guest games.
- **Public session page.** A signed-in player sees an unclaimed player's full name and a full profile card (chip Unclaimed, "Saved by the club. Not registered with ROTRA yet."), without Share profile or Open ROTRA profile. A guest keeps the "no profile" card.
- The prototype's saved demo data restarts once (store key `rotra-queue-prototype-v4`).

## Why
- Decision: [D-2026-11-16-04](../mvp/decisions.md#d-2026-11-16-04).
- Owner, November 16, 2026: "we just make unclaimed require EMAIL when the QM can know that eventually this person will come back"; "guest. will be a non existing account. no email. no phone."; "I think unclaimed should have a rtr id"; "make the player look up to be RTR ID or Email only. no more name search in player lookup. have player look up ONLY for saved players"; "they can never edit the email"; "it should just show a tag called .. details required or needs attention"; "yes remove it" (Link and Link to saved player…).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Player Information search empty, one registered match, one unclaimed match from another club (name field), no match, already in saved players, offline; New player with no email, a new email, an email on ROTRA, an email already saved, a bad email; Edit details for a guest, an unclaimed player with an email, an older record with none; Same person confirmation; profile with and without Details required; join request row for a guest; guest join form; participant card for a guest, an unclaimed player and a registered player.
- Copy:
  - Chip, filter option and line under the name: "Details required"
  - Profile notice: "**Details required.** An unclaimed player needs an email. Add their email in Edit details, or delete the player."
  - Edit details notice: "**Details required.** An unclaimed player needs an email. Add their email here, or delete the player."
  - Status lines: "Saved by your club with their email. Not registered with ROTRA yet" · "Saved by your club with a phone and no email. Not registered with ROTRA yet"
  - Profile rows: "Email" with "On file and kept private" or "None on file"
  - Guest invite text (profile and Invite sheet): "Games they played here as a guest don't follow them. To keep those games, add their email in Edit details first."
  - Invite sheet: "Your club saved them with their email. This link lets them turn that record into a ROTRA account with their phone and email, so their games and rank follow them to every club."
  - Player Information: placeholder "Full RTR ID or email"; hint "Enter the full RTR ID or email. Names are searched in your saved players only."; "Enter an RTR ID or email to find a ROTRA player."; "No ROTRA player has that RTR ID or email."; "NAME is already in your saved players."; "Confirm with the player before adding them."; offline: "Player Information search needs internet. Add them as a new player with their email now; ROTRA looks them up after you reconnect."
  - Another club's unclaimed player: "Not registered yet"; name field "Full or display name" with hint "Your club's own name for them. Other clubs keep theirs until the player registers."; error "Enter a name."
  - New player: "Email (optional)", hint "Without an email they're saved as a guest. With one they're saved as an unclaimed player and get an RTR ID. If the email is already on ROTRA, they're linked to that player. Never shown publicly."; errors "Enter an email address, like name@example.com, or leave it empty." · "That email is already NAME in your saved players."
  - Saved messages: "NAME saved as a guest" · "NAME saved · unclaimed · RTR-…" · "… · linked to their ROTRA account" · "… · already on ROTRA · RTR-…" · "… · profile lookup after sync"
  - Edit details, guest: "Email (optional)", hint "Add an email to save them as an unclaimed player. They get an RTR ID, and their games here follow them when they register. It can't be changed after you save. Never shown publicly."
  - Edit details, older record: "Email", hint "Check it with the player. It can't be changed after you save. Never shown publicly."
  - Edit details, saved email: "On file and kept private. It can't be changed here. Wrong email? Delete this player and add them again."
  - Edit details, phone hint: "Kept private. Only your club sees it."
  - Same person: title "Same person as NAME?"; "That email is already **NAME** in your saved players."; "GUEST's slots, games and payments here move to that record, and GUEST is removed from your saved players."; buttons "Back" · "Move to NAME"; toast "Moved to NAME"
  - Join request row: "Says LEVEL · requested TIME" (the phone is gone)
  - Participant card, unclaimed: "Saved by the club. Not registered with ROTRA yet."; guest: "This player is playing as a guest and hasn't registered with ROTRA yet, so there's no profile to show."
  - Prototype tip under the search: "Prototype: try RTR-PH-MNL-020326-0112 or ivan.delarosa@example.com."
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: chip (warn), notice, sheet, the Add player sheet's tabs and pick card, the level select.
- Extends: add-player-sheet — exact-match search, the name field for another club's unclaimed player, Email in New player; edit-player-form — email field states; player-profile-sheet — Email row and notice; saved-player-card — Details required chip; join-request-row and join-request-form — phone removed; participant-profile-card — unclaimed variant.
- New: the Same person confirmation (a plain confirm sheet; it replaces the removed Link to saved player… picker).
- Shares work with: [2026-11-16-player-unclaimed-identity](2026-11-16-player-unclaimed-identity.md), [2026-11-16-admin-unclaimed-rtr-id-edit](2026-11-16-admin-unclaimed-rtr-id-edit.md).

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md and the identity module — the statuses, email, RTR ID, lookup and the removed linking.
- Database design: docs/database_design/product/player-information/modules/identity.md and queue/modules/sessions-roster.md — the proposed shared entry for unclaimed players and the required email.
- Screen docs: docs/screens/product/modules/queue/players-roster.md and public-session.md.

## Real app work
- apps/queue and packages/ui: the Add player sheet, Saved players, the profile and Edit details sheets, join requests, the guest join form and the participant card as above.
- packages/data and packages/db: lookup by exact RTR ID or email, the email on club records, RTR IDs for unclaimed players, removing guest linking by phone. This reverses parts of what P08 built for D-2026-11-11-03.

## Open for the owner
- The **Same person** confirmation is new; the decision only says adding an email replaces Link.
- A returning guest who sends a new join request now gets a second guest record, because nothing links the two.
- The edit sheet still says the invited player "only need to choose a password"; Google sign-in ([D-2026-11-16-01](../mvp/decisions.md#d-2026-11-16-01)) makes that untrue, and it was left for that change.
- Lookup by phone and by QR code, and the Confirm player step for another club's unclaimed player, are not decided.
