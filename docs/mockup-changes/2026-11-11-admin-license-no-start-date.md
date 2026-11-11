# A-LICENSE: no Term starts field; the period is computed and shown read-only; history shows LIC number plus note

Status: NEW
Date: 2026-11-11
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Club detail › License tab › Activate / Renew license sheet and payment history
Route: /admin/clubs/c1?tab=license
Screen ID: A-LICENSE, A-CLUB-DETAIL
Artifact: none
Components: license-sheet, payment-history-table
Supersedes: none
Superseded by: none

## What changed
- Before: the sheet had a **Term starts** date field (suggested as the day after the current term), a review warning when the term overlapped the current one, and a notice that the early-renewal rule was undecided. Payment history had one **Reference** column showing the owner-typed text.
- After: the field is gone. The period is computed: a club with a current term starts **the day after it ends**; any other club starts **today**. Step 1 shows it read-only as **Covers** (“Dec 1, 2026 – Dec 31, 2026”), with the hint “A renewal starts the day after the current term ends.” when there is a current term. The overlap warning and the undecided notice are removed. Payment history shows **Reference** as the generated `LIC-####` number and, under it, the owner-typed **Note** when there is one.

## Why
- Owner answers of November 11, 2026 ([D-2026-11-11-06](../mvp/decisions.md#d-2026-11-11-06)): remove the Starts on field (“a license starts when you activate it”); renewals stack after the current term; payment history shows both the auto number and the typed note.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: step 1 with a current term (Covers from the day after it ends, hint shown), step 1 for an expired or never-licensed club (Covers from today, no hint), free club (Amount: Free), review step, saving, timeout / Check status, history rows with and without a note.
- Copy: **Covers**, **A renewal starts the day after the current term ends.**, **Reference**, **Note**.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: sheet, key-value-list, table
- Extends: license-sheet (drop the date field; computed period), payment-history-table (note line under the LIC number)
- New: none
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/admin/modules/clubs-licenses/README.md (License payment history, Commercial model)
- Database design: none needed (`LIC-####` and the note already exist as separate fields)
- Screen docs: docs/screens/product/modules/admin/clubs-licenses.md (A-LICENSE table)

## Real app work
- `@rotra/ui` LicenseSheet: remove the start-date field, show the computed period; PaymentHistory: LIC number plus note. `@rotra/db` `activateLicense`: start = day after the current term's end, else today; refuse a client-supplied start.
