# Share dialogs: Save to Photos on iPhone and iPad

Status: IN MOCK APP — PR #868
Date: 2026-11-15
App: player
Mockup: apps/mockup/player-app/rotra-player.html › SHEETS.share, shViewer, ACT.savePhotos; apps/mockup/queue-app/rotra-queue.html › SHEETS.shareBoard, SHEETS.shareFinish, shViewer; apps/mockup/admin-app/rotra-admin.html › admin profile share dialog, shViewer (IS_IOS, SAVE_PHOTOS, savePhotosHint in each)
Route: /player/players/<id> (Share profile) with `?ios` to preview on a computer; /queue/sessions/<id> (Results › Share leaderboard); /queue/s/<session> (Share your finish, Share leaderboard)
Screen ID: P-RANK-HISTORY share sheet, Q-RESULTS, Q-PUBLIC-RESULTS
Artifact: https://claude.ai/artifact/TgBXhq1jt8JLYXUTg9KpSJ (sample reviewed by the owner)
Components: share-image-picker, share-image-viewer, share-card (helpers: isAppleMobile)
Supersedes: none
Superseded by: none

## What changed
- Before: every share dialog had **Download N images** and **Share**. On iPhone, Safari saves downloads to the Files app.
- After: on iPhone and iPad, where the system share sheet takes files, **Download N images** becomes **Save to Photos**. It opens the system share sheet with the picked PNGs, whose **Save Image** puts them in Photos. A hint under the buttons: “Save to Photos opens the share menu. Tap **Save Image** there.” (“Save N Images” with several picked). The full-screen view's button reads **Save to Photos**.
- Unchanged: Android and computers (Download), Share, the invite cards (ShareCard), and Download images (Q-EXPORT).

## Why
- Owner, November 15, 2026: “how about just saving it directly to photos app · because right now it is a regular download going to files in ios · and a lot of users hate it”. A web page can't write to Photos directly; the share sheet's Save Image is the closest.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: one, several and no images picked (button disabled; hint “Save Image” / “Save N Images”); the full-screen view; iPhone versus other devices.
- Copy: “Save to Photos”, “Save to Photos opens the share menu. Tap Save Image there.”, “Save N Images”; error “Couldn't open the share menu. Try again.”
- Tokens: none (hint uses fg2 with fg for the bold part).
- Known differences: the prototypes only toast “Share menu opened. Tap Save Image to add it to Photos.”; the real app opens the share sheet and shows no toast, because the sheet doesn't report whether the person saved.

## Reuse plan
- Extends: share-image-picker — `saveToPhotos` override and the iPhone/iPad check; share-image-viewer — `downloadLabel`.
- Shares work with: none

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: player-information/ranking-history.md and queue/results-sharing.md — the Save to Photos paragraph.

## Real app work
- packages/ui: ShareImagePicker, ShareImageViewer, share-card helpers (`isAppleMobile`), stories and meta. Every app's share dialogs pick it up through ShareImagePicker.
