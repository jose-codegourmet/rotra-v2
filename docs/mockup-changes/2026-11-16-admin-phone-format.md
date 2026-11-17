# Admin app: phones are kept as the database holds them and shown in one grouped format

Status: TICKETED — #893
Date: 2026-11-16
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › `toE164`, `showPhone`, `reqVal`; `P` and `R` (sample data); Players quick view, player page, Edit profile; Contact changes (list, detail, approve and decline sheets, toast)
Route: /admin/players, /admin/players/<id>, /admin/contacts
Screen ID: A-PLAYERS, A-PLAYER-DETAIL, A-PLAYER-EDIT, A-CONTACT-CHANGES
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: player-quick-view, admin-player-form, contact-change-review
Supersedes: none
Superseded by: none

## What changed
- Before: the prototype kept phones with spaces and printed them as stored.
- After: a phone is kept as E.164 with no spaces ("+639175550142"). Wherever Admin sees a phone it is grouped the same way, "+63 917 555 0142", whatever form it was typed or stored in. The Edit profile phone field shows the grouped number and converts what is typed to the stored form on save. A save from before this change is converted when the prototype loads.
- **Not masked.** Admin reads the full number. Owner, November 16, 2026: "admin should always see it" ([D-2026-11-16-06](../mvp/decisions.md#d-2026-11-16-06)).

## Why
- Owner, November 16, 2026: "all phone numbers must be masked and formated correctly but it should still match how the data is. if the db data has no space all of the inputs should convert it".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a phone, no phone ("Not given"), a phone change request in each status.
- Copy: none new.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: `phoneField` and `formatPhoneForDisplay` (packages/schema).
- Shares work with: [2026-11-16-player-phone-mask-format](2026-11-16-player-phone-mask-format.md).

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: none needed.

## Real app work
- Likely none: the real Admin already stores E.164 and formats for display. To confirm when ticketed; then this log becomes `MOCKUP ONLY`.
