# Player app and rotra.club: operator name and address in the legal text

Status: IN MOCK APP — PR #951
Date: 2026-11-18
App: player
Mockup: apps/mockup/player-app/rotra-player.html › LEGAL (P-PRIVACY, P-TERMS)
Route: /player/privacy, /player/terms
Screen ID: P-PRIVACY, P-TERMS
Artifact: none
Components: legal-document
Supersedes: none
Superseded by: none

## What changed
- **Text only.** The three operator placeholders are filled, on both pages:
  - `[OPERATOR LEGAL NAME]` → “Jose Adrian Buctuanon (doing business as CodeGourmet IO)”
  - `[OPERATOR ADDRESS]` → “Lapu-Lapu City, Cebu, Philippines”
  - `[OPERATOR CITY]` (the courts in the Terms) → “Lapu-Lapu City”

## Why
- Owner, November 18, 2026: Google's sign-in branding check reads the Privacy Policy, and placeholders in it can fail the check. CodeGourmet IO is not a registered business, so the operator is the owner by name.
- Decision: [D-2026-11-18-02](../mvp/decisions/2026-11-18.md#d-2026-11-18-02), “Operator”.

## Like for like
- Copy: `LEGAL` in the mockup and, word for word, `apps/player/src/app/(public)/privacy/content.ts` and `.../terms/content.ts`, and on rotra.club `apps/landingpage/src/app/_components/legal-page/privacy-content.ts` and `terms-content.ts`.
- Known differences: none.

## Reuse plan
- Reuses as is: legal-document. New: none.
- Shares work with: [2026-11-18-player-legal-text-rewrite](2026-11-18-player-legal-text-rewrite.md).

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — the operator is named.
- Database design: none needed.
- Screen docs: docs/screens/product/modules/player-information/legal.md — the operator is named; rotra.club paths are `/privacy` and `/terms`.
- Decisions: docs/mvp/decisions/README.md — the “Operator” line of D-2026-11-18-02.

## Real app work
- Built in the same change: the same text in the Player app and rotra.club content files.

## Open for the owner
- A lawyer has not reviewed the text. Revisit the operator name if CodeGourmet IO is registered.
