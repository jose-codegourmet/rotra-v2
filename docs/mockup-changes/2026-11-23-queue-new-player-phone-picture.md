# Add player › New player takes a phone and, from Saved players, a profile picture

Status: IN MOCK APP — PR #1027
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheet `add` (New player), `confirmNew()`, `newPicEditor()`
Route: /queue/players (Saved players › Add player); /queue/sessions/s-tonight/preparation?tab=roster (Add player)
Screen ID: Q-ADD-PLAYER, Q-SAVED-PLAYERS
Components: new-player-form, club-picture-field (moved out of edit-player-details-form)
Supersedes: 2026-11-16-queue-unclaimed-email-lookup.md (in part: “No phone is asked” on New player)
Superseded by: none

## What changed
- **Phone (optional)** under the social link, in both Add player contexts: placeholder “0917 555 0142”, hint “Kept
  private. Only your club sees it. Saved with an email or a social link; a guest has no phone.” Errors: “Enter a
  Philippine mobile number, like 0917 555 0142, or leave it empty.”; with no email and no link: “Add an email or a social
  link to save a phone, or leave the phone empty.” A number another saved player already has is refused, as before.
- **Profile picture (optional)** at the top of New player, in **Saved players › Add player** only: the same Upload photo,
  Remove and character grid as Edit details, held on the sheet and saved with the player. Hint: “Shown wherever this
  player appears in your club. When they claim their profile they can change it.”
- If the player saves but the picture upload then fails, the toast says “NAME was saved, but the picture wasn't: REASON
  Set it in Edit details.” (real app only; the mockup never fails).
- The session Add player has no picture choice (a player added to a session is saved later, possibly offline); the club
  sets it afterwards in Edit details.

## Why
- Owner, November 23, 2026: “can we be able to also input the phone number and avatar” on Saved players › Add player.

## Docs updated
- Screen docs: queue/players-roster.md (New player fields)
- Business logic: queue/modules/players/README.md (New player row)

## Real app work
- Done in the same PR: NewPlayerForm phone field and picture field (club context), the Add player container saves the
  picture after the player is saved, and the phone reaches the mock and real saves.
