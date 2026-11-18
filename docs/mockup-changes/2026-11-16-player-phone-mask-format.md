# Player app: every phone shown is masked and grouped; phones are kept as the database holds them

Status: IN MOCK APP — #904
Date: 2026-11-16
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `toE164`, `maskPhone`; account fixtures; viewAccount, viewEdit (Privacy and contact), the contact-change sheet and `requestCard`, viewClaim, the identity cards
Route: /player/profile/account, /player/profile/edit, /player/claim/<token>, /player/register
Screen ID: P-ACCOUNT, P-EDIT, P-CLAIM
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: contact-details-card, private-contact-card, contact-change-request-form, claim-form
Supersedes: none
Superseded by: none

## What changed
- Before: the prototype kept phones with spaces ("+63 917 555 0142"), showed the player's own phone in full, and its mask only worked on that spaced form.
- After: a phone is kept as E.164 with no spaces ("+639175550142"), as `packages/schema` `phoneField` stores it. Every phone shown as text is masked and grouped the same way: "+63 917 ••• ••42" (the format of `maskPhone` in `packages/data`). That covers the account page, Privacy and contact, the Current row and the status text of a contact change, the claim page and the identity cards.
- A phone typed in any accepted form (0917…, 63917…, +63 917 …, with spaces or hyphens) is converted to the stored form on save. The field still groups the digits while typing and is not masked.

## Why
- Owner, November 16, 2026: "all phone numbers must be masked and formated correctly but it should still match how the data is. if the db data has no space all of the inputs should convert it".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a phone on the account, no phone, a pending phone change, a typed phone in each accepted form.
- Copy: none new; the masked form is "+63 917 ••• ••42".
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: `phoneField` and `formatPhoneForDisplay` (packages/schema).
- Moves: `maskPhone` into `packages/schema/src/phone.ts` as the one masking rule (the copies in `packages/data` and `packages/db` are removed).
- Extends: contact-details-card and the contact-change status text — show the masked phone where they show the full one.
- Shares work with: [2026-11-16-admin-phone-format](2026-11-16-admin-phone-format.md).

## Docs updated
- Business logic: none needed (phones are already private and stored as E.164).
- Database design: none needed.
- Screen docs: checked; no line showed a player their full phone. `profile.md` now says the read-only phone is shown masked.

## Real app work
- apps/player and packages/ui: mask the player's own phone wherever it is shown as text. Done in #904: ContactDetailsCard, AccountPanel, EditProfileForm, ContactChangeRequestForm and ContactRequestStatus (Player-only components; Admin keeps the full number through its own components).
