# Preparation header: icon buttons, and Cancel/Delete session in a ⋯ menu

Status: IN MOCK APP — #697 (PR #698)
Date: 2026-11-10
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation (and Session settings) › page header
Route: /queue/sessions/s-tonight/preparation
Screen ID: Q-PREP header (docs/screens/product/modules/queue/session-setup.md)
Artifact: none
Components: page-header, button, icon, overflow-menu, more-options-sheet
Supersedes: none
Superseded by: none

## What changed
- Before: six text buttons in one row (Edit preparation, Copy invite link, Session QR, Copy Facebook post, Delete session, Cancel session), the two red ones beside the everyday ones; phones showed Session QR, Copy Facebook post and a “More options” dialog.
- After:
  - Four everyday actions, each with a leading icon: **Edit preparation** (pencil; **Back to live session** with a back chevron during play), **Copy invite link** (link), **Session QR** (QR), **Copy Facebook post** (megaphone).
  - **Cancel session** and **Delete session** move into a **⋯** icon button right after the title (beside Open public page), accessible name “More for this session”. Its menu rows have an icon (circle-slash, trash), are single-line and in the error colour; Cancel session first. Before start only; Session settings during play has no ⋯.
  - Phones (≤ 640 px): the four sit in a 2×2 grid with short labels **Edit** (or **Live session**), **Invite link**, **Session QR**, **Facebook post**; accessible names keep the full labels. The phone-only “More options” dialog is removed.
  - The menu opens right-aligned under the ⋯ so it stays on screen at 375 px.

## Why
- Owner, November 10, 2026: “can you update these to use icons · organize the buttons”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: prepared (4 buttons + ⋯); ⋯ menu open; Session settings during play (Back to live session, no ⋯); phone 2×2 grid with short labels.
- Copy: “Edit preparation” / “Edit”; “Back to live session” / “Live session”; “Copy invite link” / “Invite link”; “Session QR”; “Copy Facebook post” / “Facebook post”; ⋯ “More for this session”; “Cancel session”; “Delete session”.
- Icons: pencil, back chevron, link, QR, megaphone, more (⋯), circle-slash, trash.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: `page-header/` (actions and titleAction slots), `button/`, `icon-button/`.
- Extends: `icon/` (new `link`, `megaphone`, `trash`, `ban`); `overflow-menu/` (optional `icon` per item, a single-line row with the icon).
- New: none.
- Removes: the preparation page's use of `more-options-sheet/` (the component stays for other pages).
- Shares work with: none

## Docs updated
- Business logic: none needed (same actions, same dialogs).
- Database design: none needed.
- Screen docs: docs/screens/product/modules/queue/session-setup.md — header actions, ⋯ menu, phone grid.

## Real app work
- `@rotra/ui`: icons and the `overflow-menu` item icon, with stories.
- `apps/queue` preparation: icons on the four buttons, short phone labels, Cancel/Delete in an `OverflowMenu` titleAction, the More options sheet removed from this page.
