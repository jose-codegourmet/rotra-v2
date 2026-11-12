# Admin › Profile banners: uploads cropped to 5:2, tiles 5:2

Status: IN MOCK APP — #765
Date: 2026-11-12
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Settings › Profile banners (cropToWide, .bn-grid)
Route: /admin/settings/profile-banners
Screen ID: A-BANNERS
Artifact: none
Components: profile-banners-page, character-grid, image-drop-zone
Supersedes: none (amends 2026-11-11-admin-profile-banners)
Superseded by: none

## What changed
- Before: uploads were centre-cropped to 3:1 and saved at 600 × 200; the tiles were 3:1; the drop zone said “cropped to 3:1”.
- After: uploads are centre-cropped to **5:2** and saved at 1000 × 400; the tiles (and the loading skeleton) are 5:2; the drop zone says “cropped to 5:2”. Banners uploaded at 3:1 keep working, centre-cropped to fill.

## Why
- The Player profile banner moved to 5:2, the ratio of the owner's banner photo (#765, November 12, 2026). Whether Admin follows was an open point; decided by the implementing agent so uploads match what players see ([D-2026-11-12-03](../mvp/decisions.md#d-2026-11-12-03)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: unchanged (shown, hidden, uploading, rejected, delete with undo, offline); only the tile ratio changes.
- Copy: **or click to choose · PNG, JPG or WebP, up to 2 MB each · cropped to 5:2**
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: ProfileBannersPage, ImageDropZone
- Extends: CharacterGrid — the banner variant's tiles are 5:2
- New: none
- Shares work with: 2026-11-12-player-profile-banner-layout-dialog

## Docs updated
- Business logic: docs/business_logic/product/admin/modules/configuration/README.md — cropped to 5:2
- Database design: docs/database_design/product/admin/modules/configuration-requests.md — cropped to 5:2
- Screen docs: docs/screens/product/modules/admin/configuration.md — copy and tiles 5:2

## Real app work
- packages/data `cropProfileBannerToWide` crops to 5:2 at 1000 × 400; packages/db checks a PNG upload is 5:2; ProfileBannersPage copy, CharacterGrid banner tiles and the Admin skeleton 5:2. Built in #765.
