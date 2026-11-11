# Profile page: a public banner across the top of the profile card, like Discord

Status: IN MOCK APP — #754
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Player profile (own and public) › left profile card
Route: /player/players/u1 (own), /player/players/b2 (someone else)
Screen ID: P-PROFILE, P-PUBLIC-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-hero
Supersedes: none
Superseded by: none

## What changed
- Before: the profile card started with the picture and name side by side on a plain surface.
- After: a banner strip (accent gradient from the existing tokens) runs edge to edge across the top of the card; the 88 px picture overlaps its bottom edge with a surface-coloured ring, and the name and nickname sit beside the picture below the banner. Everything else on the card (Player ID, Edit profile / My player ID / Share profile, Compare) is unchanged. The same card is used for your own profile and for another player's public profile.

## Why
- Owner comment on the Player artifact, November 11, 2026, anchored on the profile card: "this part here should show a public banner like discord".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile (camera button on the picture, This is you chip), someone else's profile, photo / character / initials picture, long name wrapping under the banner.
- Copy: none changed.
- Tokens: none new (banner uses --accent-dim, --accent, --accent-subtle; ring uses --surface).
- Known differences: none

## Owner comments, November 11, 2026 (second and third)
- "please add a corner for updating banner", then "the banner settings should show only predefined banners. it should not be uploadable".
- Changed: Edit profile › Name gets a **Profile banner** block under the picture row: six predefined banners as swatches (**Court**, **Night**, **Dusk**, **Ember**, **Sun**, **Stripe**; a radio group), the current one outlined, and the line **Selected: Court**. Tapping a swatch applies it at once with the toast **Banner updated**. No upload and no remove: the default is Court. The profile card shows the chosen banner. The banner is public, like the picture. Every banner is drawn from the theme tokens, so both themes hold up.
- Copy added: **Profile banner**, **The strip across the top of your profile card. Public. Pick one of ROTRA's banners; your own images can't be uploaded.**, **Selected: NAME**, the six banner names, **Banner updated**.
- The set is managed by the platform owner in Admin › Settings › Profile banners (owner comment, November 11, 2026; Admin log 2026-11-11-admin-profile-banners), like profile characters. The Player prototype shows the six seeded samples.

## Reuse plan
- Reuses as is: card, avatar
- Extends: profile-hero (banner strip, overlapping picture)
- New: none
- Shares work with: the Queue participant profile card (same banner treatment, #731 log)

## Docs updated
- Business logic: `docs/business_logic/product/player-information/modules/identity/README.md` › Profile banner (predefined banners only, managed in Admin, no uploads, default Court, avatars are circles); header “Last verified”.
- Database design: `docs/database_design/product/player-information/modules/identity.md` › `players` (`banner_id`, reference to Admin's `profile_banners`, null = default; no storage for players).
- Screen docs: `docs/screens/product/modules/player-information/profile.md` › P-PUBLIC-PROFILE, Profile banner, P-EDIT-PROFILE (name preview, Banner swatches, copy); `docs/screens/product/modules/player-information/README.md` (P-PUBLIC-PROFILE and P-EDIT-PROFILE rows).
- Other: `docs/product-terms.md` › §4 Profile banner, §12 Profile banner row.

## Real app work
- `@rotra/ui` ProfileHero: banner strip and overlapping avatar, banner by key. EditProfileForm: banner radio group. `@rotra/data` `banner` key on the player profile; real mode needs one small column (migration sign-off needed). No storage.

## Owner comment, November 11, 2026 (fourth, on Edit profile › Name)
- "I think the layout here should mimic how the profile dialog looks like".
- Changed: the top of Edit profile › Name is now a live preview of the profile card: the chosen banner runs edge to edge across the panel top, the picture overlaps it with the pencil button on it (opens the picture sheet), and the name and nickname beside it update as you type. Under it: the line **This is how the top of your profile card looks. Tap the pencil to change your picture; pick a banner below.**, then the **Banner** swatches with **Selected: NAME · Public. Pick one of ROTRA's banners; your own images can't be uploaded.** The separate Profile picture and Profile banner rows are gone.
- Copy added: the two sentences above and the **Banner** label. Removed: **Profile picture**, **Shown on the leaderboard and your profile.**, **Change picture** (now the pencil), **Profile banner**.

## Owner comment, November 11, 2026 (fifth): "avatar shape here needs to be circle"
- Changed: the big 88 px profile picture on the profile card (and in the Edit profile preview) is a circle instead of a rounded square. The pencil button keeps its place at the bottom-right of the circle.
- Also circles now (second “needs to be circle shape” comment): the share card picture (on screen and in the downloaded image), the large leaderboard podium picture and the 52 px avatar used on cards. No rounded-square avatar remains in the Player prototype.
- Owner comment, November 11, 2026 (“there shouldn't be any rounded square shaped avatars, just circles please”): the leaderboard podium's second and third-place pictures were the last rounded squares in the Player prototype; now circles. The same rule is applied to the Queue prototype (the large and extra-large avatar sizes) and the Admin prototype (the large size and the picture in the Profile picture sheet), so no rounded-square avatar remains in any prototype.
