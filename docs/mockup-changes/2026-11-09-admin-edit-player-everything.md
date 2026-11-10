# Edit player: Admin edits everything, with a picture picker and a beta-only password field

Status: IN MOCK APP — #589
Date: 2026-11-09
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › Quick view side panel › Edit
Route: /admin/players
Screen ID: A-PLAYER-EDIT (inside A-PLAYERS)
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: player-edit-form, profile-picture-picker, pager, avatar
Supersedes: 2026-11-08-admin-edit-profile-email.md (the email-as-contact-change-request form and Review changes step)
Superseded by: none

## What changed
- Before: Edit had Full name, Nickname, a Profile photo link (unclaimed only), an Email field that sent a contact-change request, a required Reason and **Review changes**; phone, rank and RTR ID not editable.
- After: an intro line, then sections:
  - **Profile picture**: 72 px preview + label (Photo / Character / Initials, “Current picture” / “Changes when you save”), **Upload a photo** (PNG, JPG or WebP, up to 1 MB, cropped to a square), **Use initials**, **Previous picture** row with **Use previous picture**, and “Or pick a character” showing only the shown library images, 8 per page with a “‹ Previous · Page N of M · Next ›” pager.
  - **Name** (Full name, Nickname), **Playing style** (style, experience years/months, playing since month/year), **Links** (Facebook, Instagram, YouTube, LinkedIn, each checked for its site), **Privacy** (Private profile, Hide phone number from clubs switches).
  - **Account**: Phone and Email, checked for format and uniqueness and applied directly; **Password *(for MVP or beta only)*** (exact label; show/hide; at least 8 characters; empty keeps it; disabled for unclaimed; the prototype stores only that it was set, shown as “Last set by Admin <time>”).
  - Read-only list: RTR ID, Created by, Account (Registered/Unclaimed), Rank, Recent matches, with a note on why.
  - **Reason for the change** (required when anything changed).
- **Review changes** becomes **Save changes**: inline errors, focus on the first; one Activity-log entry (“Edited <name>: <fields>. Reason: …”), visible on the player's Activity tab; toast “Saved <name>: <fields>.” (+ “Give the new password to the player yourself.”); “Nothing changed.” when nothing did.

## Why
- Owner comments on the published Admin artifact, November 9, 2026: “admin should be able to edit the image. show the image picker for avatars” and “since admin you should be able to edit everything. also password (for now) wrap it with *(for mvp or beta only)*”. Decision D-2026-11-09-14.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: registered vs unclaimed (password disabled); each field error; reason missing; picker pages; previous picture present/absent; upload errors; nothing changed; offline.
- Copy: as in the mockup and docs/screens/product/modules/admin/players-requests.md › A-PLAYER-EDIT.
- Tokens: none new.
- Known differences / Open:
  - **Conflict:** the password field conflicts with approved decision **D-2026-11-07-01**, which says the player chooses their password and “the Admin never sees” it. D-2026-11-09-14 records the owner's beta-only approval but needs explicit owner sign-off and an end date before this is ticketed or built. docs/mvp/decisions.md was not edited by this change.
  - Direct phone/email edits bypass the contact-change request flow (#564); decided 2026-11-10 (Option A): the open request for that field is marked “Superseded by an Admin edit” (rejected plus `supersededAt`), logged, and can no longer be approved or applied.
  - The repo mockup keeps the Password resets page (#491), which the artifact lacked.

## Reuse plan
- Reuses as is: `avatar/`, the pager pattern, field/switch styles from Player Edit profile
- Extends: `player-edit-form/` (all fields, sections, Save changes), the picture picker from `profile-picture-sheet/` (Admin variant over the shown library)
- New: none
- Shares work with: 2026-11-09-admin-profile-characters.md, 2026-11-09-player-avatar-character-pages.md, 2026-11-09-player-previous-picture.md

## Docs updated
- Business logic: docs/business_logic/product/admin/modules/player-management/README.md — Admin edits everything
- Database design: docs/database_design/product/admin/modules/configuration-requests.md — `admin_audit_events` (admin-set password, MVP/beta only; one profile_updated event)
- Screen docs: docs/screens/product/modules/admin/players-requests.md — A-PLAYER-EDIT; README.md module table
- Terms: none

## Real app work
- Replace the edit form with the full form and Save changes (revision-checked, one audit event); the picture picker over the shown library; direct phone/email updates with uniqueness checks; the beta-only password set only after the D-2026-11-07-01 conflict is signed off.
