# Player app: a faster, mobile-first Your details step with clear Required fields

Status: NEW
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `viewClaim` (the details step), `field()` (Required pill), `.req-pill`,
`.ob-details`, `.ob-more` styles
Route: /player/claim/<token> and /player/register/<club>?session=<slug>&invite=<code> (step 1 of the onboarding)
Screen ID: P-ONBOARD step 1 (P-CLAIM fields); every form using `field()` (Required pill)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: details step, Required pill, optional fold, fixed Continue footer
Supersedes: none
Superseded by: none

## What changed
- Before: one long card mixing contact, password, city and every About-you field. Required fields had a small red star.
  Continue sat at the very bottom.
- After:
  - **Intro:** “Only fields marked Required are needed to continue; the rest can wait.”
  - **Needed to continue** card: Full name; the Google account, or email and password; the mobile number (read-only
    “already on file” when the club saved one); City when asked.
  - **Required pill:** every required label carries a green **Required** pill in place of the star. This applies to
    every form in the Player app built with the shared field helper.
  - **Gender:** now in Needed to continue as required Male · Female chips, with the error “Choose Male or Female.” (owner
    follow-up the same day: “since this is a new record this form will have to require gender”). Edit profile keeps it
    optional for existing accounts.
  - **Optional · add now or later:** a folded card for nickname, experience and links, prefilled from the club.
    It opens by itself if one of them has an error.
  - **Footer:** fixed at the bottom, with “Next: 3 quick questions” and **Continue**.
  - **Phones:** 48 px tall inputs with 16 px text so they don't zoom, and tighter side padding.

## Why
- Owner artifact comment, November 19, 2026, on Your details: “a lot of players find it hard to navigate thru this and
  some part of the field are not so obvious if it is required or not and also make this page more optimized for mobile
  since players usually are in mobile and is answering fast so they can play already”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States:
  - the club-created profile with Google;
  - the session link with Google;
  - no Google (email and password);
  - the admin link with City;
  - an error in an optional field (fold opens);
  - the matching-account warning.

## Copy
- “Check what your club filled in. Only fields marked Required are needed to continue; the rest can wait.” (“Check what
  you need to fill in.” without a club profile)
- “Needed to continue” · “Required” · “Phone number · already on file” · “Linked to this profile. Not your number? Ask the
  club or ROTRA.” · “Mobile number” · “Private. Never shown publicly.” · “For password resets. Private.”
- “Optional · add now or later” · “Nickname, experience and links, prefilled from your club” · “Choose Male or Female.” · “You can change
  all of these later in Edit profile.” · “Next: 3 quick questions” · Continue

## Open
- None.

## Also
- Back on the first question (Where you play) reopens Your details (owner artifact comment, same day: “I cant go back
  to initial form”). The account already exists, so the details show prefilled with the sign-in method and phone
  read-only. **Continue** saves and returns, with the toast “Details saved”; **Cancel** returns without saving.
- The onboarding header now carries the Prototype button, so the mockup can be reset mid-onboarding. This is a
  prototype control, not part of the product.

## Docs updated
- screens/product/modules/player-information/access-registration.md (P-ONBOARD step 1)
