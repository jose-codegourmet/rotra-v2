# Player profile banner: 5:2, nothing overlaps it, banner pencil and a banner dialog

Status: IN MOCK APP — #765
Date: 2026-11-12
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile › profile card (.card.hero); Edit profile › Name (.edit-hero); Profile banner sheet (SHEETS.banner)
Route: /player/players/<own id>, /player/profile/edit
Screen ID: P-OWN-PROFILE, P-PUBLIC-PROFILE, P-EDIT-PROFILE
Artifact: none
Components: profile-hero, player-identity-card, edit-profile-form, banner-sheet (new; replaces banner-picker)
Supersedes: none (amends 2026-11-11-player-profile-banner)
Superseded by: none

## What changed
- Before: a 96 px banner strip with the 88 px picture pulled up over its bottom edge (surface ring), the name beside it partly over the banner; the only pencil was on the picture. Edit profile › Name showed the preview, then an inline **Banner** grid of swatches that applied at once.
- After: the banner runs edge to edge at **5:2** with no fixed height and nothing over it. Below it, a row with the picture (left, with its pencil) and the name, nickname and badges, 14 px apart; no negative margin and no surface ring.
- The own profile and the Edit profile preview add a **banner pencil**: a 34 px round accent button in the banner's top-right corner, inset 10 px (“Change banner”). Another player's profile never shows it.
- The banner pencil opens a **Profile banner** dialog with the same behaviour as Profile picture: a grid of 5:2 tiles (2 across on phones, 3 from 640 px), the draft outlined with the accent ring; **Cancel** and **Done** (disabled until the pick changes). Done saves with the toast **Banner updated**; Cancel, × or the scrim discard the draft.
- Edit profile › Name loses the inline Banner grid and its “Selected: …” line; the helper text changes.
- The compact profile cards (profile dialog, participant card) keep their small banner strip.

## Why
- Jose, #765 (November 12, 2026): “re arrange the layout to not overlap the banner image”, “the banner image should have the same ratio as this photo” (2560 × 1024, 5:2), “add that if possible the edit banner is in the banner too like top right corner”, “make sure the banner picker is a dialog … same behavior as profile pic”. Open points decided by the implementing agent: [D-2026-11-12-03](../mvp/decisions.md#d-2026-11-12-03).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: someone else's profile (no banner pencil); own profile (both pencils, This is you chip); Edit profile preview (both pencils); dialog with the saved banner (Done disabled), a changed pick (Done enabled), saving (Saving…, no dismissal), save failed (error line, dialog stays); long name wrapping beside the picture.
- Copy: **Change banner** (aria-label and title); **Profile banner** (dialog title); **Public. Pick one of ROTRA's banners; your own images can't be uploaded.**; **Cancel**; **Done**; **Saving…**; **Banner updated**; **This is how the top of your profile card looks. Tap a pencil to change your picture or banner.**
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: Sheet, ProfileBanner, Avatar, Icon
- Extends: ProfileHero — `onChangeBanner` and the 5:2 banner wrapper; PlayerIdentityCard — `onChangeBanner`; EditProfileForm — `onChangeBanner` replaces `onBannerChange` / `banners` / `bannerDisabled`
- New: BannerSheet — the dialog, modelled on ProfilePictureSheet (BannerPicker removed)
- Shares work with: 2026-11-12-admin-banner-crop-5-2

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — the pick is made in the dialog; 5:2, nothing over the banner
- Database design: none needed
- Screen docs: docs/screens/product/modules/player-information/profile.md — Profile banner, Profile banner dialog, Edit profile Name preview
- MVP: docs/mvp/decisions.md — D-2026-11-12-03

## Real app work
- packages/ui: ProfileHero, PlayerIdentityCard, EditProfileForm, new BannerSheet (BannerPicker deleted). apps/player: `useBannerSheet` used by the profile page and Edit profile. Built in #765.
