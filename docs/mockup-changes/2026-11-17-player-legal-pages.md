# Player app: Privacy Policy and Terms of Service pages

Status: IN MOCK APP — PR #928
Date: 2026-11-17
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewLegal, LEGAL (P-PRIVACY, P-TERMS), viewLogin (legal note)
Route: /player/privacy, /player/terms, /player/login
Screen ID: P-PRIVACY, P-TERMS, P-LOGIN
Artifact: none
Components: legal-document, auth-card, sign-in-form, page-header
Supersedes: none
Superseded by: none

## What changed
- **P-PRIVACY (new), `/privacy`.** The normal public page shell, a page head with "Privacy Policy" and "Effective November 17, 2026", then the sections as headings with paragraphs and bulleted lists in a readable column (max width 720 px): Who we are · What we collect · People saved by a club before they register · How we use your information · What is public and what is private · Who we share it with · Where it is stored and how we protect it · How long we keep it · Your rights · Children · Changes to this policy · Contact.
- **P-TERMS (new), `/terms`.** The same layout with "Terms of Service": What ROTRA is · Your account · Clubs and Queue Sessions · Results, rank and leaderboards · Acceptable use · Your content · Suspension and ending an account · The service as it is · Changes to these terms · Governing law · Contact.
- **P-LOGIN.** Under the sign-in card, outside it, one small centred muted line: "By continuing you agree to the Terms of Service and Privacy Policy." The two names are links (accent colour, underlined) to `/terms` and `/privacy`.
- Both pages are public and static: no sign-in, no controls, no states. Signed in after the Google deadline, the P-GOOGLE-REQUIRED stop does not cover them.
- Nothing else changes on other screens.

## Why
- Owner, November 17, 2026: two public pages on the Player app, `https://player.rotra.club/privacy` and `https://player.rotra.club/terms`, so the Google sign-in consent screen can link to them.
- Decision: [D-2026-11-17-01](../mvp/decisions/2026-11-17.md#d-2026-11-17-01).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: the static page only; P-LOGIN with the new line.
- Copy: the full page text is `LEGAL` in the mockup and, word for word, `apps/player/src/app/(public)/privacy/content.ts` and `apps/player/src/app/(public)/terms/content.ts`. Page head line "Effective November 17, 2026". Login line as above.
- Tokens: none new. Text uses `--fg` and `--fg2`; the login links use `--accent`.
- Known differences: none.

## Reuse plan
- Reuses as is: page-header — the title and effective-date line.
- Extends: auth-card — new `below` slot for a line under the card; sign-in-form — new `legalLinks` prop that fills it.
- New: legal-document — no existing component renders long sections of headings, paragraphs and lists.
- Shares work with: none.

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — "Privacy Policy and Terms of Service pages" section (what they cover; no new rules).
- Database design: none needed.
- Screen docs: docs/screens/product/modules/player-information/legal.md — P-PRIVACY and P-TERMS; access-registration.md — P-LOGIN's new line; README.md and docs/screens/product/navigation.md — the module and the routes.

## Real app work
- Built in the same change: `@rotra/ui/legal-document`, the `below` slot on AuthCard, `legalLinks` on SignInForm, the `/privacy` and `/terms` routes in `apps/player/src/app/(public)/`, and the line on `/login`. `apps/player/src/proxy.ts` protects only `/me`, `/profile` and compare, so both pages are public in mock and real mode without a change.

## Open for the owner
- The text is a plain-language draft that a lawyer has not reviewed. The other open points are listed under [D-2026-11-17-01](../mvp/decisions/2026-11-17.md#d-2026-11-17-01).
