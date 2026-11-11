# Admin › Settings › Profile banners: the owner manages the banners players can pick

Status: IN MOCK APP — #754
Date: 2026-11-11
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Settings › Profile banners
Route: /admin/settings/profile-banners
Screen ID: A-BANNERS (new; modelled on A-CHARACTERS)
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: image-library-page, drop-zone, image-tile
Supersedes: none
Superseded by: none

## What changed
- Before: no banners anywhere in Admin.
- After: a **Profile banners** item in the Settings group of the left rail (badge = banners shown), opening a page built exactly like Profile characters: intro copy, a drag-and-drop upload area (**Drag banners here to upload** · or click to choose · PNG, JPG or WebP, up to 2 MB each · cropped to 3:1), then a grid of wide 3:1 tiles, each with its name under it. Click a tile to hide or show it (hidden tiles dim); × deletes with an undo toast. At least 2 must stay shown. Uploads are centred-cropped to 3:1 and shown to players at once. Six sample banners are seeded (**Court**, **Night**, **Dusk**, **Ember**, **Sun**, **Stripe**), the same six the Player prototype offers.
- Players never upload: they pick one of the shown banners in Edit profile (Player log 2026-11-11-player-profile-banner). Hiding or deleting a banner never takes it from players who already use it.

## Why
- Owner comment on the Admin artifact, November 11, 2026: "please add banners, like profile characters. banners are like discord banners that players can show on their rotra profile".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: all shown, some hidden (dimmed tiles, "N hidden" in the intro), minimum reached (toast), upload success toast, upload rejected (type, size, unreadable), delete with undo, offline (every action refuses with the offline error).
- Copy: **Profile banners**; **The strip across the top of a player's profile card, like a Discord banner. Players pick one of the shown banners from Edit profile; they can't upload their own. Click a banner to hide or show it. N shown · N hidden.**; **Drag banners here to upload**; **or click to choose · PNG, JPG or WebP, up to 2 MB each · cropped to 3:1**; **Shown to players. Click to hide.** / **Hidden from players. Click to show.**; **Keep at least 2 banners shown, so players have a choice.**; **Keep at least 2 banners shown. Upload or show another one first.**; **N banners added and shown to players.**; **Not added: …**; **NAME deleted.** (undo).
- Tokens: none new. The six samples are drawn from the theme tokens.
- Known differences: none

## Reuse plan
- Reuses as is: the Profile characters page pieces (drop zone, tile with hide/show and delete, undo toast), rail link
- Extends: image tile with a 3:1 variant and a caption
- New: A-BANNERS page
- Shares work with: Player log 2026-11-11-player-profile-banner (the picker reads this set)

## Docs updated
- Business logic: docs/business_logic/product/admin/modules/configuration/README.md (new Profile banner library section; Profile character library: 15 per page, at least 15 shown, upload progress bar)
- Database design: docs/database_design/product/admin/modules/configuration-requests.md (new `profile_banners` section; players reference a banner key, no uploads by players; character minimum 15 noted)
- Screen docs: docs/screens/product/modules/admin/configuration.md (new A-BANNERS; A-CHARACTERS 15 per page and progress bar), docs/screens/product/modules/admin/access-navigation.md (rail item), docs/screens/product/modules/admin/README.md (index)
- MVP: docs/mvp/workstreams/admin.md (status row, gap line, related decision)

## Real app work
- Admin: `/settings/profile-banners` route, `ProfileBannersPage` in `@rotra/ui` reusing the characters page; `profile_banners` table like `profile_characters` (migration sign-off needed); Supabase Storage for uploads (D-2026-11-08-03). Player: banner picker reads the shown banners; `players.banner_id`.
