# View: My Join Requests

## Purpose

History of **`club_join_requests`** initiated by the logged-in player (request to join, invite link flow, direct invite outcomes). Separate URL from club applications so join vs create-club contexts stay clear.

## Route

`/profile/join-requests` — authenticated only.

## Roles

**Player**.

---

## Layout

- Page title: **Join requests**.
- Rows: club name + thumbnail, method (`request`, `invite_link`, `direct_invite`), status (`pending`, `approved`, `rejected`), dates.
- Tap row → club profile or join flow as appropriate.

---

## Cross-links

- Club membership rules: [`../../../business_logic/client_app/04_club_system.md`](../../../business_logic/client_app/04_club_system.md) §4.4
- Database: [`../../../database/02_clubs.md`](../../../database/02_clubs.md) (`club_join_requests`)
