# Player app: shots step gets a graphic and Others (players add their own shots)

Status: NEW
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `SHOTS_ART`, `pickSkills`, `ACT.skillOthers` / `skillAdd` / `skillRemove`,
`gameOf`, `editFields`, the profile's Shots chips, `.ob-banner`, `.ob-chip.own`, `.ob-x`
Route: the onboarding's Shots you know step; /player/profile/edit?tab=game; /player/players/<id>
Screen ID: P-ONBOARD step 3, P-EDIT-PROFILE, P-PUBLIC-PROFILE / P-OWN-PROFILE
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: step banner, shot chips with Others
Supersedes: none
Superseded by: none

## What changed
- **Banner:** a Higgsfield picture above the chips (gpt_image_2_6, rotra.club style): Tara with a fan of shot paths
  (smash, drop, clear, drive, net shot).
- **+ Others:** a new chip after the list opens **Add a shot** with an **Add** button.
  - Each added shot shows as a picked chip with a remove ×.
  - Up to 6 of your own, 24 characters each, no repeats of the list.
- **Where it applies:** the same picker is in Edit profile, and the profile's Shots chips include the player's own shots.
  Skip clears them too.

## Why
- Owner artifact comment, November 19, 2026, on Which shots do you have?: “add a graphic and also add Others. like let
  them add more”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Others closed and open; add, remove, empty, too long, already on the list, the 7th shot; Edit profile; profile
  Shots.

## Copy
- “Pick all that apply, or add your own with Others. Clubs see these when they plan matches.” · “+ Others” · “Add a shot”
  · “e.g. Crosscourt drop” · “Add” · “Add as many as you like, up to 6. N added.”
- “Type a shot first.” · “Keep it to 24 characters or fewer.” · “That shot is already on the list.” · “You can add up to 6
  of your own.” · “Remove NAME”

## Open
- None.

## Docs updated
- business_logic/product/player-information/modules/identity/README.md (own shots)
- database_design/product/player-information/modules/identity.md (`skills_other`)
- screens/product/modules/player-information/access-registration.md (P-ONBOARD step 3)
