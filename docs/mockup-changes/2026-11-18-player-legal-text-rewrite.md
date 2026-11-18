# Player app: fuller Privacy Policy and Terms of Service text

Status: IN MOCK APP — PR #<n>
Date: 2026-11-18
App: player
Mockup: apps/mockup/player-app/rotra-player.html › LEGAL, LEGAL_EFFECTIVE (P-PRIVACY, P-TERMS)
Route: /player/privacy, /player/terms
Screen ID: P-PRIVACY, P-TERMS
Artifact: none
Components: legal-document
Supersedes: none
Superseded by: none

## What changed
- **Text only.** The layout, the component and the data shape (sections › paragraph and list blocks) are unchanged.
- **Effective line:** "Effective November 17, 2026" → "Effective November 18, 2026" on both pages.
- **P-PRIVACY sections, before → after.** Before: Who we are · What we collect · People saved by a club before they register · How we use your information · What is public and what is private · Who we share it with · Where it is stored and how we protect it · How long we keep it · Your rights · Children · Changes to this policy · Contact. After: Who we are · What we collect · People saved by a club before they register · Why we use your information · Levels, ranks and automated processing · What is public and what is private · Who we share it with · Where it is stored and how we protect it · If there is a breach · How long we keep it · Cookies and device storage · Your rights · Children · Links to other sites · Changes to this policy · Contact.
- **P-TERMS sections, before → after.** Before: What ROTRA is · Your account · Clubs and Queue Sessions · Results, rank and leaderboards · Acceptable use · Your content · Suspension and ending an account · The service as it is · Changes to these terms · Governing law · Contact. After: What ROTRA is · Who can use ROTRA · Your account · Club accounts and licenses · Clubs and Queue Sessions · Playing is at your own risk · Results, rank and leaderboards · Acceptable use · Your content · ROTRA's property · Other companies' services · Suspension and ending an account · The service as it is · Limits on our liability · If your actions cause a claim · Events outside our control · Changes to these terms · Governing law and disputes · General · Contact.
- **Operator placeholders** in the text: `[OPERATOR LEGAL NAME]`, `[OPERATOR ADDRESS]`, `[OPERATOR CITY]`.
- **Google wording** is true with the `player_google_sign_in` flag on or off: "You sign in with your email and password, or with Google where it is offered", "If you sign in with Google: ...". The old "You sign in with Google" and "By continuing with Google" lines are gone.
- **Corrected:** levels are given by clubs; ROTRA works out ranks, statistics and leaderboard places (the old text said ROTRA works out levels).

## Why
- Owner, November 18, 2026: a stronger, more complete version of both pages, in the same plain-language voice, that is also shown on rotra.club (`#privacy`, `#terms`) and covers clubs that request a quotation there.
- Decision: [D-2026-11-18-02](../mvp/decisions.md#d-2026-11-18-02) (amends [D-2026-11-17-01](../mvp/decisions.md#d-2026-11-17-01)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: the static page only.
- Copy: the full page text is `LEGAL` in the mockup and, word for word, `apps/player/src/app/(public)/privacy/content.ts` and `apps/player/src/app/(public)/terms/content.ts` (and on rotra.club `apps/landingpage/src/app/_components/legal-page/privacy-content.ts` and `terms-content.ts`). Page head line "Effective November 18, 2026".
- Tokens: none new.
- Known differences: none.

## Reuse plan
- Reuses as is: legal-document — the same sections, paragraphs and lists; page-header — the title and effective-date line.
- Extends: none.
- New: none.
- Shares work with: [2026-11-17-player-legal-pages](2026-11-17-player-legal-pages.md).

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — "Privacy Policy and Terms of Service pages": the date, what each page now covers, where the text lives, and the age rule.
- Database design: none needed (no new data is stored).
- Screen docs: docs/screens/product/modules/player-information/legal.md — the date, the section lists, the placeholders and the rotra.club copies.
- Decisions: docs/mvp/decisions.md — new D-2026-11-18-02; amendment note on D-2026-11-17-01.

## Real app work
- Built in the same change: the new text in `apps/player/src/app/(public)/privacy/content.ts` and `.../terms/content.ts`, word for word the mockup's `LEGAL`. No component or route change.

## Open for the owner
- The text is a plain-language draft that a lawyer has not reviewed. The three placeholders and the other open points are listed under [D-2026-11-18-02](../mvp/decisions.md#d-2026-11-18-02).
