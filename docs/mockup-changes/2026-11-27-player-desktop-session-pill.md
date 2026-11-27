# Player desktop session link returns to the green pill

Status: IN REAL MODE — #1156
Date: 2026-11-27
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `navItems`, desktop top bar and phone dock
Route: every Player page with a session slot
Screen ID: all P- screens with navigation
Artifact: none (owner supplied a screenshot in chat)
Components: player-nav
Supersedes: 2026-11-26-player-session-button-options.md (desktop top-bar style only)
Superseded by: none

## What changed
- The wide-screen top bar's Play, Ready or Next up session link uses the earlier green pill style, with normal navigation type. It keeps the same destination and accessible name.
- The phone dock keeps the pixel button, its live shine and its existing labels.

## Why
- Owner, November 27, 2026, pointing to the desktop pixel Play button: “please dont do this for desktop”; requested the mockup and real-mode app change together.

## Like for like
- Compare desktop at 1280 px and the dock at 375 px, in dark and light themes. Check Play, Ready and Next up.
- Copy and tokens are unchanged. The top bar reuses its existing `--accent-subtle` and `--accent` pill style.

## Reuse plan
- Extends: `PlayerNav` — render the session slot as a green pill in the desktop top bar and as the pixel button in `PlayerNavDock`.
- New: none.

## Docs updated
- Business logic: none needed; session selection and destinations are unchanged.
- Database design: none needed; no data or schema change.
- Screen docs: `docs/screens/product/modules/player-information/README.md` — desktop and phone session styles.

## Real app work
- Update `@rotra/ui/player-nav` to match the mockup in both mock and real data modes.
