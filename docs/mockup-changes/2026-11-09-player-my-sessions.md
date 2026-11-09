# The own profile has a My sessions card

Status: IN PROGRESS — #588
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Own profile › My sessions
Route: /player/players/u1
Screen ID: P-OWN-PROFILE
Artifact: none
Components: list-row, chip, empty-state, card (new: my-sessions-card)
Supersedes: none
Superseded by: none

## What changed
- Before: the own profile had no list of the player's sessions.
- After: a **My sessions** card in the right column, directly above Recent games. It lists the player's upcoming and live sessions they requested, are confirmed in or are waitlisted in. Each row shows the session title, "Date · start–end · Club" and a chip (Requested, Confirmed, Waitlist #N, Happening now), and the whole row links to the Queue session page `/s/<slug>` (prototype: `/queue/s/<slug>`). Loads once when the profile opens, with no live updates. Migs has three sample rows: live tonight, upcoming, waitlisted.

## Why
- Owner decision D-2026-11-09-04 (My sessions bullet): the profile lists the sessions a player requested, is confirmed in or is waitlisted in, each linking to `/s/<slug>`.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Rows (live, confirmed, waitlist); empty (new player).
- Copy: My sessions; Happening now; Confirmed; Waitlist #2; Requested; "No upcoming sessions. Sessions you join from a club's session link show here."
- Tokens: none (existing tokens only; rows use `--elev`, `--border`, `--accent`)
- Known differences: none

## Reuse plan
- Reuses as is: `chip/`, `empty-state/`, `card/`
- Extends: `list-row/` (whole-row link variant with a trailing chip)
- New: `my-sessions-card/` — a titled list of session rows; nothing existing groups them
- Shares work with: 2026-11-09-player-your-clubs.md, 2026-11-09-player-registration-from-links.md (same profile page)

## Docs updated
- Business logic: none needed (D-2026-11-09-04 already states the rule)
- Database design: none needed (read-only list over session requests and roster rows)
- Screen docs: profile.md (P-OWN-PROFILE)

## Real app work
- Add `my-sessions-card` to `@rotra/ui` with stories and `.meta.ts`; wire a one-time load of the player's sessions on the own profile in `apps/player`; rows link to the Queue app's `/s/<slug>`.
