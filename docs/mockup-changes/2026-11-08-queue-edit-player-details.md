# Queue Master can edit a guest's or unclaimed player's details before inviting them

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players › player profile dialog › Edit details; Invite sheet
Screen ID: Q-SAVED-PLAYERS

## What changed
- The player profile dialog gets **Edit details** next to **Invite** for guests and unclaimed profiles
  (registered players own their details, so they don't get it).
- **Edit details** sheet: Full or display name, Nickname, Level for this club, Phone. For unclaimed
  profiles also Email, Playing style, Experience (Years + months and Playing since, linked) and Links.
  Phone already on file shows "On file and kept private. Not their number? Ask ROTRA to change it."; a
  profile with no phone gets a typable Phone field ("This profile has no phone yet. They need one to
  register."). Save details → toast "Details saved · NAME", back to the profile dialog.
- Invite sheet hint for unclaimed profiles: "Works once and lasts 7 days; opening Invite again makes
  another link without cancelling this one."
- Prototype: Faye Dimaculangan is an unclaimed profile with no phone on file.

## Why
- Owner, November 8, 2026: the club fills in what it knows so the invited player mostly just sets a
  password; a profile with no phone could not be registered at all.
- Owner, November 8, 2026: a new invite link no longer cancels the earlier one; links simply expire
  after 7 days (TBD, see business open decisions).

## Docs updated
- Business logic: queue/modules/players/README.md (club edits, link issuing); business open-decisions.md (L5 TBD)
- Database design: player-information/modules/identity.md (club-entered contacts, playing since)
- Screen docs: queue/players-roster.md (Edit details sheet, Invite dialog)

## Real app work
- Edit details sheet and form in `@rotra/ui`, a Queue route that saves club and profile fields for the
  club's own guest/unclaimed players, and issuing links without revoking earlier ones.
- **Not built yet: Level for this club.** A club level is stored as a session assessment (it needs a
  session and feeds shared rank), so saving it from Saved players needs a decision on where a
  saved, session-less level lives. The real app's Edit details leaves it out for now.
