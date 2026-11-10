# Settings › Profile characters: a plain grid of the character images players pick from

Status: IN MOCK APP — #646
Date: 2026-11-09
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Settings › Profile characters
Route: /admin/settings/profile-characters
Screen ID: A-CHARACTERS
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: admin-rail, image-drop-zone, character-grid, toast (with Undo)
Supersedes: none
Superseded by: none

## What changed
- New rail link **Profile characters** under Settings, after Feature flags, with the count of shown images (`I.n_face` icon); route `/settings/profile-characters`.
- The page: heading **Profile characters**; one helper line “Players see the shown images, 8 per page. Click an image to hide or show it. N shown · M hidden.”
- A drag-and-drop zone “Drag images here to upload” / “or click to choose · PNG, JPG or WebP, up to 1 MB each”: images only, several at once, each cropped to a centred square and kept as a data URL; clicking opens the file picker. Toasts “N images added and shown to players.” and “Not added: …” listing rejected files.
- A plain grid of the images in upload order. Clicking an image hides or shows it (hidden = opacity .25, `aria-pressed`). A small × deletes it, with a 6-second **Undo** toast. At least 8 must stay shown (hide/delete below that is refused with a toast).
- Seeded with 24 sample uploads (the illustrated faces, drawn by the prototype); the library is saved with the page's existing saved state. Every change is logged in the record of actions.

## Why
- Owner comments on the published Admin artifact, November 9, 2026: “this is too much. I just want a simple grid of images. maybe the toggle can be done via clicking the image and opacity .25 if hidden and then a small x icon for deleting. upload should just be drag images to upload” and “for the admin character library it should just be me (admin) uploading images”. Decision D-2026-11-09-13.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: all shown; some hidden (dimmed); drag over the zone (accent border); upload added / rejected; delete with Undo; hide or delete refused at 8 shown; offline (refused).
- Copy: as quoted under What changed.
- Tokens: none new (`--accent`, `--accent-subtle`, `--border-strong`, `--elev`).
- Known differences: the prototype stores uploads as data URLs in local saved state and draws the seed images; the real app stores files in Supabase Storage. The repo mockup keeps the Password resets rail link and page (#491), which the artifact did not have.

## Reuse plan
- Reuses as is: admin rail, page head, toast
- Extends: toast (an Undo button variant)
- New: `image-drop-zone/`, `character-grid/` (image buttons with a delete ×)
- Shares work with: 2026-11-09-player-avatar-character-pages.md (players' picker), 2026-11-09-admin-edit-player-everything.md (Admin picker), 2026-11-09-queue-club-set-player-pictures.md (club picker uses the same list)

## Docs updated
- Business logic: docs/business_logic/product/admin/modules/configuration/README.md — Profile character library
- Database design: docs/database_design/product/admin/modules/configuration-requests.md — `profile_characters` (proposed)
- Screen docs: docs/screens/product/modules/admin/configuration.md — A-CHARACTERS; access-navigation.md and README.md — navigation and module table
- Terms: none

## Real app work
- Settings page with the drop-zone upload (Storage, admin-only writes), show/hide on click, delete with Undo, minimum 8 shown, audit events; a read endpoint of shown characters for the Player, Admin and Queue pickers.
