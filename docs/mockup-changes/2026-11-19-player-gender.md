# Player app: optional gender on the profile, with a reminder until it is added

Status: IN MOCK APP — #1081
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Edit profile › Name, registration About you, profile About, notifications
Route: /profile/edit, /p/RTR-…, /notifications
Screen ID: P-EDIT-PROFILE, P-PROFILE, P-NOTIFICATIONS, P-CLAIM
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: select field, notice, notification item (reuse)
Supersedes: none
Superseded by: none

## What changed
- **Gender · public** select in Edit profile › Name and in the registration form: “Not added yet”, Male, Female, with the
  hint “Optional for now. Clubs use it to name your matches: Men's, Women's or Mixed Doubles. Until you add it, your
  matches count as Genderless.”
- **Reminder:** your own profile shows a warning notice “Add your gender.” with **Add gender** until it's set, and an
  unread Account notification “Add your gender” opens Edit profile › Name.
- **Profile About** has a Gender row: shown on others' profiles when set, and on your own as “Not added” until set.
- Sample data: Migs starts without a gender (to show the reminder); the named sample players have one.

## Why
- Owner, November 19, 2026: optional for now, with a notification asking players to fill it in; shown on public profiles.
  [D-2026-11-19-01](../mvp/decisions/2026-11-19.md#d-2026-11-19-01).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile without and with a gender; another player's profile with and without; the notification unread and
  opened; Edit profile with each choice; registration.

## Copy
- “Gender · public”, “Not added yet”, “Male”, “Female”; the hint above; notice “Add your gender. … Add gender”;
  notification “Add your gender” with the same body.

## Docs updated
- docs/screens/product/modules/player-information/profile.md, notifications.md
- docs/business_logic/product/player-information/modules/identity/README.md
- docs/database_design/product/player-information/modules/identity.md (`players.gender`, proposed)
