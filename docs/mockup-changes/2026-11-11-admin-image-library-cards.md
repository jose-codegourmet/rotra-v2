# Admin › Profile characters and Profile banners: each image is a card

Status: CANCELLED
Date: 2026-11-11
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Settings › Profile characters, Settings › Profile banners
Route: /admin/settings/profile-characters, /admin/settings/profile-banners
Screen ID: A-CHARACTERS, A-BANNERS
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: image-library-page, image-card
Supersedes: none
Superseded by: none

## Cancelled
- Owner comment on the same thread, November 11, 2026: "please revert this". The card layout was reverted the same day; Profile characters and Profile banners are back to the plain image tiles with the corner ×. The upload progress bar (second comment on this log) and the 15-per-page size stay.

## What changed
- Before: a tight grid of bare image tiles (88 px squares); hidden ones were faded to 25%; a small × floated on each corner for delete.
- After: each image is a card (surface, border, 10 px padding): the image on top (still clickable to hide or show), then a caption row with the name and a **Shown** (accent) or **Hidden** chip, then a row with **Hide** / **Show** and a ghost **Delete** button. Hidden cards get a dashed border and a 40% image. Characters grid: cards at least 150 px wide; banners grid: at least 210 px, 3:1 image. The floating × is gone.

## Why
- Owner comment on the Admin artifact, November 11, 2026, on Profile characters: "can these be cards". Applied to Profile banners too so the two libraries match.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: shown card, hidden card (dashed border, faded image, Show button), long name (ellipsis), minimum-shown toast, delete with undo toast.
- Copy: **Shown**, **Hidden**, **Hide**, **Show**, **Delete** (buttons and chips). Accessible names: **Hide NAME** / **Show NAME** on the image, **Delete NAME**.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: card, chip, button (xs, ghost)
- Extends: image-library-page (card grid instead of tiles)
- New: image-card
- Shares work with: 2026-11-11-admin-profile-banners

## Docs updated
- none yet — proposal pending owner approval; the Admin configuration screen doc follows when approved

## Real app work
- `@rotra/ui` ProfileCharactersPage and ProfileBannersPage: render ImageCard (image, name, Shown/Hidden chip, Hide/Show, Delete) instead of the tile and corner ×.

## Owner comment, November 11, 2026 (second): "when dragging and dropping or uploading there should be a progress bar"
- Changed: while files are being added (drag-and-drop or the file picker), a progress block appears under the drop zone on both pages: **Uploading N of M…** with an accent progress bar that fills as each file is processed, then disappears when the usual toast reports the result. Rejected files still count towards M. In the prototype each file pauses briefly so the bar is visible; the real app drives it from the Supabase Storage upload progress.
- Copy added: **Uploading N of M…**
- States added: uploading (bar), finished (bar gone, toast).
