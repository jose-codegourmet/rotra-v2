# Session page: account bar with Log in, or the signed-in Player and Sign out

Status: IN MOCK APP — #585
Date: 2026-11-10
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › top bar (`pubTopBar`)
Route: /queue/s/s-tonight (and the operator preview /queue/sessions/s-tonight/public-page)
Screen ID: Q-PUBLIC-DETAILS (shared composition)
Artifact: none
Components: public-account-bar (new), avatar, button
Supersedes: none
Superseded by: none

## What changed
- Before: the session page had no top bar. A visitor could not tell whether they were signed in to ROTRA Player, and a signed-in Player had no way to sign out from it.
- After: a slim sticky bar at the top: **ROTRA** on the left; on the right the theme toggle and the Player sign-in.
  - Signed out (visitor, or a guest with a request): **Log in** (accessible name “Log in with ROTRA Player”), the same Player login that returns to this page.
  - Signed in: a pill with the Player's picture, first name or nickname and a chevron. It opens a menu (272 px): a header with the 40 px picture, the full name (bold) and the RTR ID (small, monospace) beside it; a divider; **My ROTRA profile** (person icon, external-link icon at the end; opens ROTRA Player in a new tab); **Sign out** (log-out icon, error colour). Single-line rows, 44 px tall, no helper text (owner feedback, November 10, 2026: the first version with helper lines “looks so bad … use icons too”).
  - **Sign out** returns the page to the visitor view with the toast “Signed out”.
  - The operator preview shows the visitor's bar (Log in there only toasts “Preview · visitors log in with ROTRA Player here”, prototype only).

## Why
- Owner, November 10, 2026: “in the public session page there should be some sort of navbar to determine if the user is logged in as their rotra account or signout”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: signed out (Log in); signed in, menu closed; signed in, menu open; after Sign out (visitor view + toast); operator preview (visitor bar). A long name truncates with an ellipsis at 14 characters in the pill.
- Copy: “Log in” (accessible name “Log in with ROTRA Player”); pill accessible name “Signed in as NAME. Account menu”; “My ROTRA profile” (accessible name “My ROTRA profile, opens in a new tab”); “Sign out”; toast “Signed out”.
- Icons: person (My ROTRA profile), external link (trailing), log-out (Sign out), chevron down (pill).
- Tokens: none (existing `--surface`, `--border`, `--border-strong`, `--elev`).
- Known differences: none. The **Prototype** button in the bar is prototype tooling only.

## Reuse plan
- Reuses as is: `avatar/`, `button/`, the theme toggle used by the app top bars, the app's icon set (user, external link, log out, chevron).
- Extends: none.
- New: `public-account-bar/` (the bar with its signed-out and signed-in states and the account menu). No existing `@rotra/ui` component is a public, non-operator top bar with an account menu; reuse the menu primitive the operator app's `…` menus use.
- Shares work with: 2026-11-09-queue-public-signed-in-names-join (signed-in viewer)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — the page shows who is signed in; Sign out signs out of ROTRA Player on the device; a sent request stays sent.
- Database design: none needed.
- Screen docs: docs/screens/product/modules/queue/public-session.md — Shared composition: the account bar.

## Real app work
- `@rotra/ui` `public-account-bar/` with stories in both themes (signed out, signed in, menu open, long name).
- `apps/queue` `/s/[slug]`: render it above the page. Signed in comes from the signed-in viewer (mock: the Player session; real: the Player app's access read, #687). **Log in** uses the existing Player login URL. **Sign out** calls the Player app's sign-out (real mode: a credentialed `POST` on the Player origin, paired Queue origin only, like `/api/public-sessions/[slug]/join`), then refetches so the page shows the visitor view. **My ROTRA profile** opens the Player app's `/find/<RTR>` (or `/players/<id>`) in a new tab.

## Tickets
- #692 (Q17.16) Component: PublicAccountBar
- #693 (Q17.17) Screen: account bar on the session page, with Sign out
