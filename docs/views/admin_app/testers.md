# Admin — Testers (`/testers`)

## Directory (`/testers`)

- Header: **Testers** + **Invite new tester**
- Filter: status (all, pending, active, revoked, expired)
- Table: Name, Email, Status pill, Invited by, Invited at, Resend/Revoke
- Row click → `/testers/[id]`

## Invite dialog

- Email
- Display name
- Submit → redirect to tester detail

## Detail (`/testers/[id]`)

- Back link
- Name, email, status pill
- Tags chips
- Resend / Revoke (contextual)
- Invitation history table

## Status pills

| Status | Color |
|--------|-------|
| pending | Amber |
| active | Green |
| revoked | Red |
| expired | Muted |
