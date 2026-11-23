# Add player: a social link saves an unclaimed player without an email (#1019)

Status: IN MOCK APP — #1019
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheet `add` (New player, Player Information), `confirmNew`, `saveEditPlayer`; `DIRECTORY`
Route: /queue/players (Saved players › Add player); /queue/sessions/s-tonight/preparation?tab=roster (Add player)
Screen ID: Q-SAVED-PLAYERS, Q-ADD-PLAYER, Q-ROSTER
Components: add-player-sheet, add-player-form, edit-player-details-form
Supersedes: 2026-11-16-queue-unclaimed-email-lookup.md (in part: what makes a record unclaimed, lookup keys)
Superseded by: none

## What changed
- **Add player › New player.** New **Social link (optional)** field under Email, placeholder `https://facebook.com/yourname`,
  hint “Facebook, Instagram, YouTube or LinkedIn. Shown on their profile. If the link is already an unclaimed player on
  ROTRA, they're linked to that player.” The Email hint becomes “Never shown publicly. If the email is already on ROTRA,
  they're linked to that player.” A muted line under both: “With an email or a social link they're saved as an unclaimed
  player and get an RTR ID. With neither, they're saved as a guest.”
- **Validation.** Not a profile on one of the four sites: “Enter a Facebook, Instagram, YouTube or LinkedIn profile link, or
  leave it empty.” A link that is already a saved player: “That social link is already NAME in your saved players.”
- **Normalizing.** `m.`, `www.`, `mobile.` and `fb.com` are dropped to the provider's site; query, hash and trailing slash
  are dropped; lower case. Two links that normalize the same are one person.
- **Matching.** A link that is already an **unclaimed** player on ROTRA links the new entry to that player and RTR ID
  (“· already on ROTRA · RTR-…”). If the email and the link point to different unclaimed players, the link wins. Offline:
  Lookup pending, as with email.
- **Player Information lookup.** Also finds an **unclaimed** player by exact social link (placeholder “Full RTR ID, email or
  social link”). Registered players are never found by a link.
- **Edit details.** Each link is checked for its own site. Removing the only key (no email, no link) turns the unclaimed
  player back into a guest (“Details saved · NAME · now a guest”).
- Prototype: `facebook.com/jun.bautista` is another club's unclaimed player saved with a link only.

## Why
- Owner decisions, November 22, 2026, in #1019: a social link is an entry key for an unclaimed player; one link is one
  unclaimed person across clubs; the key only matters while unclaimed; claiming is by invite link only; the link wins over
  the email; the club can edit or remove it; the link is public; no key left means guest.

## Docs updated
- product-terms.md (Unclaimed, Guest, Player lookup, Lookup pending)
- Business logic: queue/modules/players/README.md; player-information/modules/identity
- Database design: player-information/modules/identity.md (`player_social_links` is an entry key for unclaimed players)
- Screen docs: queue/players-roster.md (New player fields, lookup)

## Real app work
- Done in the same PR as this log (#1019): AddPlayerForm field and schema, mock store, real-mode services, lookup, and a
  migration with a unique normalized key for unclaimed players' links.
