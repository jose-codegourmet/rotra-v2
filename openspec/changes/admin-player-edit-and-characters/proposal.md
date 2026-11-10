# Proposal: Admin edits everything on a player and manages the profile character library

Epic A07 (#589). Decisions: D-2026-11-09-13 (profile character library) and D-2026-11-09-14 (Admin edits everything, with a beta-only password field), signed off by the owner on 2026-11-10.

## Why

The owner asked that the character pictures players choose from are controlled in Admin, and that Admin can edit everything on a player. Both are built on mock data; real mode is a follow-up.

## What changes

- Admin > Settings > Profile characters (`/settings/profile-characters`): a plain grid of images with drag-in upload, hide or show, delete with Undo.
- Admin > Players > Edit player: picture section, the full form, one reason, one Activity log entry per save.
- A password field labelled "Password *(for MVP or beta only)*" with no end date set (the owner has no timeline).
- A direct phone or email edit supersedes the open contact-change request for that field (Option A).

## Out of scope

Real mode: Supabase Storage for characters, a `profile_characters` table, a full-form PATCH and an admin-set password through Supabase. Ranking math stays read-only.
