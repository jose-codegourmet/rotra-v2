# Player app: Google sign-in (mandatory), invite landings and connecting Google to existing accounts

Status: IN MOCK APP — #892
Date: 2026-11-16
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewLogin, viewInvite, inviteHero, viewJoinClub, viewJoinSession, viewGoogleLink, viewGoogleRequired, gRequiredBand, viewClaim (Google mode), viewAccount (Sign-in methods), SHEETS.gpick, SHEETS.noGoogle
Route: /player/login, /player/register/c1, /player/register/c1?session=s-thu-open&invite=k7m2, /player/register/c3?session=s-sat-doubles&invite=p4x9 (signed in), /player/connect-google, /player/claim/demo, /player/profile/privacy-and-contact
Screen ID: P-LOGIN, P-INVITE, P-JOIN-CLUB, P-JOIN-SESSION, P-GOOGLE-LINK, P-GOOGLE-REQUIRED, P-CLAIM, P-PHONE-PRIVACY
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: auth-card, google-button, invite-card, google-identity-row, announcement-band, sign-in-methods-card, sheet
Supersedes: none
Superseded by: none

## What changed
- **P-LOGIN.** Before: email and password only. After: **Continue with Google** at the top, then "Signed up with a password?" and the email + password form (Forgot password? beside the Password label). A Google account that isn't on ROTRA shows "This Google account isn't connected to ROTRA." with what an existing player and a new player should do. A context notice shows when the player came from an invite ("Sign in to join <club>." / "Sign in to request a spot in <session>.").
- **P-INVITE (new layout of the register entry).** Before: the registration form opened straight away. After: an invite card first, then **Continue with Google**, **I don't have a Google account** and **Sign in to join / continue**.
  - Club invite card: "Club invite", "Join <club>", city and member-count chips, the saved-players sentence.
  - Session invite card: "Session invite", "<inviter> invites you to play", date block, session title, club, date and time, chips "Join requests open" and "Invited by <name>", "The Queue Master confirms who plays. Signing up doesn't reserve a spot."
  - Admin link card: "ROTRA registration", "Create your ROTRA account".
- **Google registration.** After picking a Google account: the form shows "Signs in with" and the Google account row with an **Email confirmed** chip; no email or password fields; full name prefilled from Google; phone (and city for the Admin link) still required. Button **Create account**. The account is created with its email confirmed.
- **The email + password sign-up is removed** for new players (mandatory Google). The claim flow's method step becomes "Connect your Google account" with Google only.
- **P-JOIN-CLUB (redesign).** The invite card, then "Signed in as <name>" and **Join <club>** / **Not now**; "You're already in <club>." when already a member.
- **P-JOIN-SESSION (new).** Signed-in player on a session invite: the invite card, "Signed in as", "Your request to join is ready to send on the session page. The Queue Master sees that <inviter> invited you.", **Continue to request to join** (opens `/s/<slug>?join=1&invite=<code>` in Queue) / **Not now**. States: own invite ("This is your own invite…"), already in, already on the waitlist.
- **P-GOOGLE-LINK (new).** A password player who picks a Google account with the same email: "Connect Google to your account?", their profile row, the Google row with **Same email**, **Connect Google and sign in** / **Use my password instead**.
- **Announcement band (new).** Yellow band at the top of every page while the signed-in player isn't verified (see the verification log). After the deadline its bottom border is thicker and **Remind me later** goes away.
- **P-GOOGLE-REQUIRED (new).** After the deadline, a password sign-in without Google stops at "Connect Google to continue" (Connect Google, I don't have a Google account, Sign out).
- **No Google account sheet (new).** "No Google account?": make a free Google account with the email you already use, four steps, then come back.
- **Google account picker sheet.** Prototype stand-in for Google's own window.
- **Privacy and contact › Sign-in methods (new card).** Google: Connected · <email> (+ "(different from your ROTRA email)"), **Required** chip and **Change**, or **Connect Google**. Email and password: "Backup only until <deadline>" / "Password set · <email>". A row pointing to the Verification page.
- **Forgot password.** An account that signs in with Google gets "<email> signs in with Google and has no password. Go back and choose Continue with Google." instead of the Admin review notice.

## Why
- Owner, November 16, 2026: "I want the players app to be login with google … make sure you also cover the invite to session, invite to club flows too."
- Owner: "I think we have to consider players with no google accounts linked to their accounts".
- Owner: "I think we should make it mandatory … if users without google is logging in there should be some sort of announcement in the top banner".
- Owner: "announcements like this should be yellow bg".
- Decision: [D-2026-11-16-01](../mvp/decisions/2026-11-16.md#d-2026-11-16-01).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: sign-in default, Google pending ("Waiting for Google…"), Google account not on ROTRA, offline; invite (club, session with and without inviter, Admin link); Google form with errors; already signed in (club, session, own invite, already in, waitlisted); link screen; required screen; Sign-in methods with and without Google, different email.
- Copy: as listed above, exactly as the mockup has it.
- Tokens: `--g-blue #4285f4`, `--g-red #ea4335`, `--g-yellow #fbbc05`, `--g-green #34a853` (Google mark only, same in both themes); `--ann-bg` dark `#3a3000` / light `#fff3b0`, `--ann-border` dark `#ffd400` / light `#e6b800`, `--ann-tag` dark `#ffd400` / light `#7a5c00`.
- Known differences: the account picker sheet is a prototype stand-in for Google's window; the real app redirects to Google.

## Reuse plan
- Reuses as is: sheet, notice, chip, avatar, field, the login card layout.
- Extends: the login card (Google button, divider, context notice); the registration form (Google mode without email and password fields); the email banner slot (a second, yellow announcement band).
- New: google-button (the Google mark and label, pending state), invite-card (club / session / Admin variants), google-identity-row, announcement-band, sign-in-methods-card.
- Shares work with: [2026-11-16-player-account-verification](2026-11-16-player-account-verification.md), [2026-11-16-player-notifications](2026-11-16-player-notifications.md).

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — Google sign-in, linking, deadline.
- Database design: docs/database_design/product/player-information/modules/identity.md — Google identity on the account, password-only accounts.
- Screen docs: docs/screens/product/modules/player-information/access-registration.md — P-LOGIN, P-INVITE, P-JOIN-CLUB, P-JOIN-SESSION, P-GOOGLE-LINK, P-GOOGLE-REQUIRED; identity-privacy.md — Sign-in methods.

## Real app work
- Supabase Google provider and the OAuth callback route in apps/player; the Player sign-in, invite, join and link screens; Sign-in methods card; the announcement band. Real mode needs the owner's Google Cloud OAuth client and Supabase settings first.
- Real mode written in #922 behind `player_google_sign_in` (November 18, 2026), completed November 20, 2026 ([D-2026-11-20-01](../mvp/decisions/2026-11-20.md#d-2026-11-20-01)): the Admin link card and Google registration with the city (the RTR ID takes that place, no club joined), and the session invite card naming the inviter from `invite=` (own invite included). Migration `20261118000200_player_google_sign_in` is applied to the shared database; `20261120000100_admin_link_registration` is written, not applied. Not run against Google yet (#896).
