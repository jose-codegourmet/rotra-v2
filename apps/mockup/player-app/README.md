# ROTRA Player Information prototype

`rotra-player.html` is the single-file design reference for the v1 Player Information app: the overall leaderboard, public and own player profiles, the rank explanation, game history, the player ID and QR code, phone privacy, contact-change requests, sign-in, password reset, and finishing a club-created profile. Open it in any browser. Nothing is installed and nothing is sent anywhere. The QR code is drawn by `qrcode-generator` from cdnjs; without it the ID still shows as text.

**November 16, 2026 (player statuses, [D-2026-11-16-04](../../../docs/mvp/decisions.md#d-2026-11-16-04)):** unclaimed players are public and carry a "Not registered yet" mark on the leaderboard (#18 and #23), the profile dialog and the profile page; the claim page shows the record's email, not its phone; registering with an email two clubs saved opens the "Which identity is correct?" dialog (Prototype panel › "Unclaimed: email saved by two clubs (Paolo)", or pick Paolo in the Google account picker). [Log](../../../docs/mockup-changes/2026-11-16-player-unclaimed-identity.md).

**November 16, 2026:** mandatory Google sign-in (sign-in page, club and session invite landings, connecting Google to password accounts, the yellow ROTRA announcement, the after-deadline page), the Verification page and the Notifications page, reviewed as https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN ([logs](../../../docs/mockup-changes/README.md) dated 2026-11-16). The Prototype panel's first section, "New design: Google sign-in and invites", opens each of them; in the Google account picker, Ana is new, Migs's example.com email matches his account, his Gmail doesn't, and Jomar is for the club-created profile.

**Saved version:** October 26, 2026. It matches version 8 of the published artifact (sharing is set from its Share menu): https://claude.ai/artifact/EZazPwVN1p9cTzAgsuGZw4

Since version 1: ranks use the nine playing levels (Beginner, Intermediate and Advanced, each Low / Mid / High) with no I–V steps, and browsers holding an older save convert to them; phone numbers typed into sign-in and the contact-change form are grouped as you type; the leaderboard opens with a "Top three" podium styled to match the pixel fire: a dark stage lit in the brand green with a faint pixel grid and drifting embers, pixel-notched steps (2nd, 1st, 3rd) with pixel-font numbers, and an animated pixel fire behind #1. Motion stops for reduced motion. Edit profile is split into sections (Name, Playing style, Links, Account) with a menu on the left, tabs on phones.

It shares its tokens, type and base components with the [Queue prototype](../queue-app/README.md).

## How it relates to the docs

Layout and copy choices the prototype makes are listed in [Player Information screen modules](../../../docs/screens/product/modules/player-information/README.md#reference-prototype).

Screen IDs follow [Player Information screens](../../../docs/screens/product/modules/player-information/README.md) (`P-LEADERBOARD`, `P-PUBLIC-PROFILE`, `P-OWN-PROFILE`, `P-EDIT-PROFILE`, `P-RANK-DETAIL`, `P-ELIGIBILITY`, `P-MATCH-HISTORY`, `P-ID-QR`, `P-PHONE-PRIVACY`, `P-CONTACT-REQUEST`, `P-LOGIN`, `P-FORGOT`, `P-RESET`, `P-CLAIM`, `P-CLAIM-STATUS`). Rules come from [Player Information business logic](../../../docs/business_logic/product/player-information/README.md). Where the docs leave something open (link visibility, playing-style options, whether fun games appear in public history, exact window boundaries), the prototype picks a placeholder and says so in its copy. Nothing here is implemented in the apps.

## Prototype-only parts

- **Prototype** button (top bar): sign in as Migs, switch his rank state (on the leaderboard, below threshold, needs reassessment, updating, no rank yet), simulate offline, change the leaderboard state, edit the Admin weight and match requirement, approve or decline a contact-change request, open registration and password-reset links in their different states, make the next profile save fail, and reset the demo data.
- Sign in with `0917 555 0142` (typed with or without spaces) or `migs.santos@example.com` and any password. After finishing Jomar's registration, his phone or email works too.
- Data is kept in this browser's `localStorage` (`rotra-player-prototype-v1`), and the theme choice in `rotra-player-theme`.
- Saving, sending and sign-in use short timers instead of real work.
- The 1,284 leaderboard players, their IDs and game histories are generated fixtures, not real data. No numeric rating is shown because the formula is not specified.
