# Registration from club, session and Admin links, email banner and Join club page

Status: IN PROGRESS — #588
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Registration form (/register), success page, email banner, Join <club>? page, Prototype sheet
Route: /player/register/c1
Screen ID: P-REGISTER (access-registration.md)
Artifact: none
Components: auth-card, field, notice, button, page-header (new: email-confirm-banner, join-club-card)
Supersedes: none
Superseded by: none

## What changed
- Before: the registration form was only for a club invitation, stayed unlinked and never created an account.
- After: the form's context label follows the link: "Registration link from <club>", "Session link from <club> · <session title>" (`?session=<slug>`) or "ROTRA registration" (Admin link, `/register`). The intro adds the privacy line. The Admin link adds a required **City or province** select. Success shows "Welcome, <name>" and "You're now in <club>'s saved players." (session link adds "Your request to join <session> is ready to send." and **Back to the session**); the player is signed in. Until the email is confirmed a banner shows on every page (**Resend email**, prototype-only **Mark confirmed**) and a contact-change request is refused. A signed-in player opening a club link sees **Join <club>?** (or "You're already in <club>."). The Prototype sheet has entry points for all of these.

## Why
- Owner decisions D-2026-11-09-06 (registration from session and club links, email confirmation) and D-2026-11-09-08 (club invite link: signed-in player sees "Join <club>?" and taps once).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Three form contexts; field errors incl. "Pick your city or province."; Creating pending; success (club, session, Admin); banner; contact change refused; Join <club>?; already in club.
- Copy: Create your ROTRA account with your phone and email. Your full name shows to signed-in ROTRA players on sessions you join.; City or province; Pick your city or province.; Used in your player ID.; Welcome, <name>; You're now in <club>'s saved players.; Your request to join <session> is ready to send.; Back to the session; Confirm your email. We sent a link to <email>. Some actions wait until it's confirmed.; Resend email; Email sent again; Confirm your email first.; Join <club>?; Join <club>; Not now; You joined <club>; You're already in <club>.; Go to my profile
- Tokens: none (existing tokens only; rows use `--elev`, `--border`, `--accent`)
- Known differences: none

## Reuse plan
- Reuses as is: `auth-card/`, `field/`, `notice/`, `button/`, `page-header/`
- Extends: `field/` (select variant for City or province)
- New: `email-confirm-banner/` — a page-wide banner with two actions; `join-club-card/` — the Join <club>? page body
- Shares work with: 2026-11-09-player-your-clubs.md, 2026-11-09-player-my-sessions.md

## Docs updated
- Business logic: identity/README.md — registration sources, club membership, email confirmation
- Database design: identity.md — `joined_via`, `email_confirmed_at`, registration location
- Screen docs: access-registration.md (links, City or province, success, Join <club>?; "stays unlinked" and "registration only from a club invitation" marked superseded), profile.md (banner)

## Real app work
- Context label and City or province on the registration form; create the account and the `club_players` row; email banner in the app shell with Resend; refuse contact-change requests until `email_confirmed_at` is set; Join <club>? page. Prototype-only: Mark confirmed. Not mockup work: spam limit, email provider, QM-side guest linking.
