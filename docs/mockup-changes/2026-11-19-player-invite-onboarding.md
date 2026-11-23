# Player app: fullscreen onboarding after an invite link, with play style, shots and favorite player

Status: TICKETED — #1081
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `viewOnboard`, `startOnboard`, `finishOnboard`, `obTop`, `viewClaim` (step 1),
`COURT_POS`, `SKILLS`, `FAV_PLAYERS`, `fieldsPicks`, `fieldsGame`, `fieldsExp`, `ACT.pickSet` / `pickToggle` / `obNext` / `obSkip` /
`obBack`, the profile's About, the prototype sheet's “Invite links and onboarding”
Route: /player/claim/<token> and /player/register/<club>?session=<slug>&invite=<code> (then the onboarding steps on the same
route); /player/profile/edit?tab=game; /player/players/<id>
Screen ID: P-ONBOARD (new), P-CLAIM, P-INVITE, P-EDIT-PROFILE, P-PUBLIC-PROFILE / P-OWN-PROFILE
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: onboarding frame (header with progress, fixed footer), court-position cards, shot chips, favorite-player chips
Supersedes: none
Superseded by: none

## What changed
- **Prototype:** the sheet has a new top section, **Invite links and onboarding**, with two entries:
  - **Account created by the QM (Jomar):** the registration link; **Is this you?** → Google.
  - **Session game link (new player):** the session invite from Migs → Google or no Google.
- **Before:** accepting either link ended on one long “Finish registering” form, then the done page.
- **After:** registration is fullscreen (no top bar or dock), with a header showing “Step N of 4” and a progress bar:
  1. **Your details:** the same form, prefilled from what the club saved. **Continue** creates the account.
  2. **Where you play:** Front court, Back court or All-round; one pick.
  3. **Shots you know:** pick any of Netting, Smash, Jump smash, Drop, Slice, Clear, Drive, Lift, Net kill, Push, Block,
     Backhand clear.
  4. **Favorite player:** Lin Dan, Lee Chong Wei, Viktor Axelsen, Kento Momota, Taufik Hidayat, Chen Long, Carolina Marín,
     Tai Tzu-ying, An Se-young, or **Others** with a typed name.
  - Steps 2 to 4 have **Back**, **Skip** and **Continue** / **Finish**, then the existing done page.
- **Profile:** the answers are public. About shows **Where they play**, **Shots** (chips) and **Favorite player**.
- **Edit profile › Playing style:** the free-text field is replaced by the same three pickers. Experience is unchanged.

## Why
- Owner, November 19, 2026, in the session: “I need the invite links prototype, where they accept a link to link their
  account with an account created by the QM and when they accept a session game link; after that they need to be in a
  fullscreen onboarding process where their details are prefilled; the onboard should ask play style (front or back court
  player), skills they know (netting, smash, drop, slice, jump smash and etc), favorite badminton player (lin dan, Lee
  chong wei and etc. then others)”. Asked:
  - the steps replace the one-page form;
  - one pick for where you play, with All-round added;
  - the questions are skippable;
  - the answers are public and replace the free-text playing style.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States:
  - each step;
  - Others with no name (error);
  - Skip on every step;
  - Back;
  - the club-created profile path and the session path (Google and no Google);
  - About with and without answers;
  - the Edit profile Playing style section.

## Copy
- “Step N of 4 · Your details / Where you play / Shots you know / Favorite player”
- “How do you play, NAME?” · “Pick where you're most at home on court.”
- “Front court · Net play, pushes and quick kills at the front.” · “Back court · Clears, smashes and drops from the back.” ·
  “All-round · Comfortable anywhere on court.”
- “Which shots do you have?” · “Pick all that apply. Clubs see these when they plan matches.”
- “Who's your favorite badminton player?” · “Pick one, or choose Others and type a name.” · “Player's name” · “Type the
  player's name, or pick another answer.”
- “Shows on your public profile. You can change it any time in Edit profile.” · Back · Skip · Continue · Finish
- About: “Where they play” · “Shots” · “Favorite player”

## Open
- Whether the plain club invite link (no session) gets the same onboarding. The mockup's registration form is shared, so
  it does today.
- The shot and player lists may grow.

## Docs updated
- business_logic/product/player-information/modules/identity/README.md (getting-to-know answers, onboarding)
- database_design/product/player-information/modules/identity.md (`personal_details` proposed shape)
- screens/product/modules/player-information/access-registration.md (P-ONBOARD), profile.md (Edit profile and About),
  README.md (module table, placeholders)
- mvp/decisions/README.md (D-2026-11-19-11), mvp/workstreams/player.md
