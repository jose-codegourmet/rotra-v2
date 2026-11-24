# Queue app: one Share button on the session header opens a share dialog

Status: IN MOCK APP — #1071
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `viewPrepare()` header, `SHEETS.share`, `ACT.openShare`
Route: /queue/sessions/x-next-full/prepare (before start) and /queue/sessions/s-tonight/prepare (Session settings during play)
Screen ID: Q-PREPARE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: header Share button, Share this session dialog (choice tiles)
Supersedes: none
Superseded by: none

## What changed
- Before: the header had three buttons: **Copy invite link**, **Session QR** and **Copy Facebook post** (a 2×2 grid
  with the first action on phones).
- After: one **Share** button (share icon) opens **Share this session**, with three tiles:
  - **Share photos**: “A post or story image with the session QR. Download it or share it to Facebook and
    Instagram.” Opens the existing Session QR dialog.
  - **Share the link**: “Anyone with it sees the public page and can ask to join.” Shows the link in a read-only field
    with **Copy link** (toast “Session link copied”).
  - **Facebook post**: “The club's post text for this session, ready to paste.” Opens the existing Copy Facebook post
    dialog.
  - Footer: **Close**.
- During play the header shows **Back to live session** and **Share**.

## Why
- Owner artifact comment, November 19, 2026, on the session header: “this can be a share button that opens a dialog to
  either share the photos or share the link”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: before start and during play; each tile; Copy link toast.

## Copy
- Button: “Share”. Dialog: “Share this session”. Tiles: “Share photos”, “Share the link”, “Facebook post”.

## Open
- The owner named photos and link only. The Facebook post stays as a third tile so it isn't lost. Keep it here, or
  move it elsewhere (it is also in the live console's ⋯ menu)?

## Docs updated
- docs/screens/product/modules/queue/session-setup.md (Q-PREPARE header actions)
