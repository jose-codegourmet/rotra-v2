# Invite to ROTRA section on the guest player details dialog

Status: IN MOCK APP — #478 (PR #482)
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Player profile sheet (guest)
Screen ID: Q-ROSTER

## What changed
- **Guest player details dialog:** new **Invite to ROTRA** section with the copy "Send this link so they can sign in to ROTRA Player. Their guest record isn't linked automatically.", a **Copy invite link** button (toast "Invite link copied"; if the clipboard is blocked the toast shows the link) and a **Share** button shown only when the browser supports sharing.
- Registered, unclaimed and lookup-pending profiles are unchanged.

## Why
- Guests had no way to reach ROTRA Player from the roster. Player self-registration does not exist yet, so the link points to the existing Player login page.

## Docs updated
- Business logic: none needed (no identity linking or merging; sign-in does not link the guest record)
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/players-roster.md — full profile dialog

## Real app work
- `PlayerProfileSheet` takes `inviteUrl?: string`; PreparationRoster passes the Player login URL (`https://player.rotra.club/login`, `http://localhost:9001/login` on localhost).
