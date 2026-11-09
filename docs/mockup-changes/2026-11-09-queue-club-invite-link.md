# Club invite link in settings, Share club invite on the dashboard

Status: IN MOCK APP — #587
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Club settings › Club invite link; Home › club header
Route: /queue/club-settings/invite
Screen ID: Q-CLUB
Artifact: none
Components: session-join-qr, club-settings, sheet, button
Supersedes: none
Superseded by: none

## What changed
- Before: no club-wide invite. After: a **Club invite link** section in the Club group of settings with a read-only link, **Copy link**, **Share club invite** and **Regenerate link** (confirm sheet). The dashboard header gets **Share club invite** beside Create session.
- The existing share card gains a club variant: “<club> invites you to play”, “Register with ROTRA and join the club”, QR with the club logo, “Scan to join”, link text, Post | Story, Download image / Share. Sheet title “Share club invite”.

## Why
- D-2026-11-09-08 (Club invite link), owner discussion, November 9, 2026.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: default; link regenerated (new `?k=` code); Post and Story card.
- Copy: “Club invite link”; “One standing link for your club. Anyone who registers through it joins your saved players. A signed-in ROTRA player who opens it joins with one tap.”; **Copy link**; “Club invite link copied”; **Share club invite**; **Regenerate link**; “Regenerate the club invite link?”; “The old link and every image with its QR stop working. People who already joined keep their place.”; **Cancel** / **Regenerate**; “Club invite link regenerated”.
- Tokens: none
- Known differences: none; the QR is a placeholder and the club id in the link is a sample.

## Reuse plan
- Reuses as is: sheet, button, invite-link row, segmented-control, club-logo
- Extends: session-join-qr — a club variant of the share card
- New: none
- Shares work with: 2026-11-08-queue-session-qr-share-card

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Club invite link paragraph
- Database design: docs/database_design/product/admin/modules/clubs-licenses.md — club invite code note
- Screen docs: docs/screens/product/modules/queue/access-home.md — Club invite link section, dashboard action

## Real app work
- Settings section, dashboard action, club share card, regenerate confirm; `/register/[clubId]` join flow and invite code storage.
