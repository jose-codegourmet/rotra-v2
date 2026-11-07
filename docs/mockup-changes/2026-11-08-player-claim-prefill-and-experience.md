# Registration form is prefilled by the club; experience has linked Playing since

Status: ALREADY A TICKET — #484
Date: 2026-11-08
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Registration link › Finish registering; Edit profile › Playing style
Screen ID: P-CLAIM, P-EDIT-PROFILE

## What changed
- **Finish registering** starts from everything the club entered (name, nickname, email, playing style,
  experience, links); every field stays editable. Intro: "Your club filled in what it knows. Check it,
  change anything that's wrong, and choose a password."
- **Phone:** read-only when the profile has one (unchanged). When it has none, a required, typable
  **Phone number** field ("This profile has no phone yet. Add your mobile number; it identifies your
  ROTRA profile."), grouped as typed; a number already on another profile is refused.
- **Experience** (registration and Edit profile): Years and Months, plus **Playing since** (month,
  year). Typing either fills the other. Hint: "Optional. Fill in either one; the other follows."
  "Playing since can't be in the future." The profile's experience line counts on from Playing since.

## Why
- Owner, November 8, 2026: the invited player should mostly only set a password; a profile with no
  phone could not register; experience should accept either form and keep itself current.

## Docs updated
- Business logic: player-information/modules/identity/README.md (claim prefill, phone at claim, experience)
- Database design: player-information/modules/identity.md (playing since from the stored snapshot)
- Screen docs: player-information/access-registration.md (P-CLAIM), player-information/README.md

## Real app work
- `ClaimForm` takes the club's values and an optional phone; a shared experience field component
  replaces Years/Months in ClaimForm and the edit-profile form; the claim service accepts a phone
  when the profile has none.
