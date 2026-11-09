# Edit profile gets an Email field that sends a contact-change request

Status: IN MOCK APP — #564
Date: 2026-11-08
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › Quick view side panel › Edit
Screen ID: A-PLAYERS
Route: /admin/players
Components: player-edit-form, player-review-changes
Superseded by: 2026-11-09-admin-edit-player-everything.md

## What changed
- Before: Edit profile had Full name, Nickname, Profile photo link (unclaimed only), Reason for the change and
  Review changes, with a note that phone, email, rank and the RTR ID cannot be edited here.
- After: an **Email** field (`type="email"`, prefilled with the current email, or empty with the placeholder
  “name@example.com”) sits between the photo link and the Reason. Order: Full name, Nickname, Profile photo
  link (unclaimed only), Email, Reason for the change, Review changes.
- Hint under Email: “A new email is sent for review as a contact-change request. The current email stays until
  the change is applied.”
- Saving never changes the email. It creates an Admin-entered contact-change request (source `owner`, status
  Pending) that is approved on the player's Contact tab like any other (Approve, Applying, Applied or Application
  failed). Same rules for registered and unclaimed players.
- When the player already has an open contact-change request (waiting, applying or needs attention) the Email
  field is disabled, with the hint “This player has an open contact-change request. Review it on the Contact
  tab.”
- The note becomes “Phone, rank and the RTR ID cannot be edited here.”
- The review (before/after) step shows an Email row “old → new” with “Sent for review · not changed yet” when the
  email changed.
- Outcome toasts: email only: “Email change sent for review. Approve it on the Contact tab.”; name or nickname
  and email: “Profile saved. Email change sent for review.”; profile saved but the request failed: “Profile
  saved, but the email change wasn't sent.” plus the field error. A failure never shows a success toast.
- Field errors on Email: invalid or cleared when one existed: “Enter an email address, like name@example.com.”;
  taken: “That email belongs to another ROTRA profile.” The same email (case ignored) is no change.

## Why
- Owner decision, November 8, 2026: Admin can fix a player's email from Edit profile, but through the same
  reviewed contact-change safeguards, so the login identity never changes without review.

## Docs updated
- Business logic:
  - docs/business_logic/product/admin/modules/player-management/README.md — Edit profile may enter a new email
  - docs/business_logic/product/admin/modules/player-management/flow/contact-change.md — owner entry point
- Database design:
  - docs/database_design/product/admin/modules/configuration-requests.md — source `owner`, reason in the audit event, no schema change
- Screen docs:
  - docs/screens/product/modules/admin/players-requests.md — edit form and #343 sentence
- MVP: docs/mvp/workstreams/admin.md — scope line

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Not in scope: phone editing, removing an email, a new auth-provider reconciliation strategy; applying in real
  mode stays unconnected (#244).
