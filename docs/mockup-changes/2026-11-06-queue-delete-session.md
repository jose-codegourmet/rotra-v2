# Delete session added to the Preparation header, next to Cancel session

Status: NEW
Date: 2026-11-06
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation (prepared session header)
Screen ID: Q-PREPARE, D-DELETE-SESSION

## What changed
- **Preparation header:** Edit preparation · Preview public page · Copy Facebook post · **Delete session**
  (new, danger style) · Cancel session (last). Both only on a prepared session; neither in live Session
  settings. Before: the prototype had Cancel session only, while the docs and the real app (PR #276) had
  Delete session.
- **Delete session** always opens D-DELETE-SESSION, as the dialog doc already describes:
  - Nobody confirmed: **Delete session?** with Session, When, Venue and Roster (“N confirmed · M on the
    waitlist · K join requests”), “The session, its public link, its waitlist and any join requests are
    removed. This cannot be undone.”, **Keep session** / **Delete session** (danger). Offline: “You're
    offline. Connect to delete this session.” and the delete button is disabled.
  - Players confirmed: **Can't delete this session**, “N players are confirmed for this session. Remove
    every confirmed player from the roster first, then delete the session.”, **Back** / **Open roster**
    (switches to the Roster and levels tab).
  - Confirming re-checks the roster; success goes Home with the toast “Session deleted · TITLE”.

## Why
- Owner decision, 2026-11-06 (Jose): **keep both**. Delete session removes a session nobody is confirmed
  in, with no record. Cancel session calls off a session players joined and keeps a read-only Cancelled
  record ([example sessions and cancel log](2026-11-06-queue-example-sessions-and-cancel.md)).

## Docs updated
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Q-PREPARE header note now says both
  stay; docs/screens/product/open-decisions.md — the “keep Delete next to Cancel” question is settled.
- Screen docs: docs/screens/product/dialogs.md — none needed (D-DELETE-SESSION already matches).
- Business logic: none needed (product-terms already separates Cancel session from Delete session).
- Database design: none needed (`deleteSession` in command-contracts.md already matches).

## Real app work
- Queue app Preparation: show **Delete session** and **Cancel session** together in the header, Delete
  before Cancel, both danger style, prepared sessions only. Delete session already exists (PR #276);
  this ticket only places it next to the new Cancel session.
