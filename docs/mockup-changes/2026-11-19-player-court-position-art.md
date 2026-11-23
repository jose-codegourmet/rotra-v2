# Player app: Higgsfield art on the Where you play cards

Status: TICKETED — #1081
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `COURT_POS_ART`, `pickCourt`, `.ob-opt.has-art` styles
Route: the onboarding's Where you play step; /player/profile/edit?tab=game
Screen ID: P-ONBOARD step 2, P-EDIT-PROFILE (Playing style)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: court-position card
Supersedes: none
Superseded by: none

## What changed
- Before: Front court, Back court and All-round were plain text cards.
- After: each card has a Higgsfield picture on top (gpt_image_2_6, rotra.club flat vector style). Tara is in each scene,
  and the lit part of the court shows the position:
  - **Front court:** at the net, about to kill the shuttle; the front of the court is lit.
  - **Back court:** a leaping smash from the baseline; the back is lit.
  - **All-round:** a ready stance mid-court; her whole half is lit.
- **Picked card:** the picture gets full colour, plus an accent check in the corner.
- **Layout:** cards sit three across from 720 px; on phones the pictures are shorter (3:1).
- The same cards appear in Edit profile › Playing style.

## Why
- Owner artifact comment, November 19, 2026, on the Where you play step: “add graphics use higgsfield”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: none picked, each picked, hover.

## Copy
- None.

## Open
- None.

## Docs updated
- screens/product/modules/player-information/access-registration.md (P-ONBOARD step 2)
