# Public page shows masked participant and waitlist names

Status: IN MOCK APP — #475 (PR #482)
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public page › Participants; Session record › Public page tab
Screen ID: Q-PUBLIC-PARTICIPANTS

## What changed
- **Public page › Participants:** card names and the waitlist go from full names to masked names: each word is its first letter plus a fixed `***` ("Jose Adrian" → "J*** A***", "Mika" → "M***", blank → "Player"). The avatar's label and initials use the masked name; the generated face is unchanged.
- **Session record › Public page tab:** its participant cards (what the link sees) show the same masked names.
- No per-participant level was shown on either view, so nothing was removed there. "Has a ROTRA profile" stays a plain label (it never linked).

## Why
- Owner request, November 7, 2026: public participant names must not be readable in full.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — new "Public participant names" section
- Database design: none needed (no table change; masking is in the public read)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Q-PUBLIC-PARTICIPANTS masked names; docs/product-terms.md — Public session page row

## Real app work
- `maskPublicName` in `@rotra/data/public-session/rules`, applied in `readPublicSession` (server) and the mock public fetcher to participant and waitlist names.
