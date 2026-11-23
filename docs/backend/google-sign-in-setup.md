# Google sign-in for players: owner setup (#896) and how the code uses Supabase Auth

**Last verified:** 2026-11-23. **Status:** real mode is **written but not run against Google**: no
sign-in has been tried, because the Google Cloud OAuth client and the Supabase provider (#896) are
not set up yet. Migration `20261118000200_player_google_sign_in` is applied to the shared database
(owner, November 20, 2026); `20261120000100_admin_link_registration` is applied to the shared database 2026-11-22 (owner request).
Decisions: [D-2026-11-16-01](../mvp/decisions/2026-11-16.md#d-2026-11-16-01),
[D-2026-11-20-01](../mvp/decisions/2026-11-20.md#d-2026-11-20-01). Ticket: #922.
Built on Supabase Auth in the Player app's real mode. The Go API has its own version (see [In the Go API](#in-the-go-api-track-go-sign-in-catch-up)), built on November 23, 2026 and tested only against a fake Google; the Supabase steps below are for the TypeScript version.

Everything here is off while the platform feature flag `player_google_sign_in` is off.

## What the owner sets up (no secret goes in the repo)

1. **Migrations, before the code is deployed and before the flag is turned on.**
   - `20261118000200_player_google_sign_in` adds `player_accounts.google_email` and
     `google_linked_at`. The Player app reads these columns on every signed-in request, flag on or
     off. **Applied to the shared database** (owner, November 20, 2026).
   - `20261118000700_drop_out_notices_session_invites` holds `session_invite_codes`, which the
     invite card reads to name the inviting player. Applied to the shared database on November 19,
     2026 ([sessions and roster design](../database_design/product/queue/modules/sessions-roster.md#session_invite_codes)).
   - `20261120000100_admin_link_registration` lets an RTR ID and a registration's staging link have
     no club (registration from the Admin link). **Written, not applied: apply it before deploying
     this code and before turning the flag on.** Until it is applied, a registration from the Admin
     link in real mode (password or Google) fails with an error and saves nothing.
2. **Google Cloud OAuth client** (Web application). Authorized redirect URI: the Supabase project's
   own callback, `https://<project-ref>.supabase.co/auth/v1/callback` (local Supabase:
   `http://127.0.0.1:<api port>/auth/v1/callback`). Scopes: `openid`, `email`, `profile` only.
3. **Supabase › Authentication › Providers › Google:** on, with that client ID and secret. The
   secret stays in Supabase.
4. **Supabase › Authentication › URL configuration › Redirect URLs:** add, exactly, for every origin
   the Player app is served from: `<player origin>/api/auth/google/callback` (production, each
   preview origin that should work, and `http://localhost:9001/api/auth/google/callback` for local
   work). A URL that is not on the list makes Supabase send the browser to the Site URL instead, and
   the sign-in fails closed.
5. **Supabase › Authentication › Providers: Allow manual linking: on.** Connect Google and Change
   while signed in use `linkIdentity` / `unlinkIdentity`, which Supabase refuses while this is off
   (the player then sees an error and nothing changes). Local Supabase: `enable_manual_linking = true`
   and an `[auth.external.google]` block in `supabase/config.toml`; neither is committed yet.
6. **Allow new users to sign up** stays on (it is today). Google registration needs the provider to
   make the login; ROTRA decides whether that login ever becomes a player.
7. Turn `player_google_sign_in` on in Admin › Settings › Feature flags when ready.

No new environment variable is needed: the app uses the `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
and `SUPABASE_SECRET_KEY` it already has, and builds the callback URL from the request's own origin.

## How it works

| Step | Where |
|---|---|
| Start (POST, JSON): PKCE verifier cookie, answer Google's URL | `apps/player/src/app/api/auth/google/start` |
| Callback (GET): exchange the code, decide, redirect to the screen that started it | `…/api/auth/google/callback` |
| The screen reads what was decided (once) | `…/api/auth/google/outcome` |
| **Connect Google and sign in** (the player's yes) | `…/api/auth/google/link` |
| Google registration from a club or session invite | `…/api/register/[clubId]/google` |
| Google registration from the Admin link (no club; the form's city) | `…/api/register/google` |
| Claim with Google | `…/api/claim/[token]/google` |
| Invite card (naming the inviting player for a Session invite code, `&invite=`) and the viewer's standing | `…/api/invites/[clubId]` |
| Rules | `packages/db/src/player/google-sign-in.ts`; provider calls in `packages/db/src/auth/google-oauth.ts` |

- **ROTRA's record decides.** Google is connected only when `player_accounts.google_email` is set.
  Supabase attaches a Google account to an existing login with the same verified email by itself,
  and there is no setting that stops it, so the callback never treats the session it gets back as a
  sign-in: it keeps it out of the sign-in cookie, and signs in only when `google_email` already
  equals that Google email. Same email, not connected: the session is held in two short-lived
  httpOnly cookies (10 minutes) and the player is asked **Connect Google to your account?**.
  **Use my password instead**, or leaving, signs nobody in: the held cookies expire, and the next
  Google sign-in asks again, because the question depends on `google_email`, not on what Supabase
  linked.
- **A session started by Google only counts for an account with Google connected.** The session
  check (`loadAccountContext`) reads the token's `amr` claim: an OAuth session for a player with no
  `google_email` is signed out everywhere, and an OAuth session is never a club's or Admin's. This
  also covers a token obtained from Supabase directly, without ROTRA's callback.
- **No ROTRA account:** on `/login` nobody is signed in, the tried email is shown, and the login
  Supabase made for that Google account is deleted (only when nothing but Google ever signed in
  with it and no player, club or Admin account uses it). On an invite or registration link the login
  is held until the form is sent and becomes the new account's login; if the form is never sent it
  stays a login that maps to no account.
- **Connect / Change while signed in** adds Google to the player's own login (`linkIdentity`); the
  ROTRA email is never touched and there is no disconnect.
- **The outcome crosses the redirect in cookies, never the URL:** no email, code or token is put in
  a ROTRA URL. The result cookie is display only; anything that grants something is checked again
  against the session or the held Google sign-in.
- **The Admin link** (`/register`, no club): the invite card needs nothing saved. The form asks for
  a city or province (the founding cities A-ADD-CLUB offers, `PH-CEB` and so on); the server finds
  it in `location_codes` and the RTR ID takes that place (`allocateRtrId` with the picked city, no
  creating club). An email clubs already saved keeps its RTR ID and needs no city. The player joins
  no club; club records that the phone or email links still join the account. The password
  registration from the Admin link (flag off) uses the same rules through `POST /api/register`.
- **A session invite names the inviter** when the link's `invite` is that session's Session invite
  code (`session_invite_codes`, made by `POST /api/public-sessions/[slug]/invite-code`): the card
  says who invited, the inviter sees their own invite, and **Continue to request to join** carries
  the code on to Queue. An unknown or another session's code shows no inviter, never an error.
- **Deadline gate:** the date is the one value in
  `packages/data/src/google-sign-in/googleSignIn.config.ts`. After it, Route Handlers refuse a
  player with no Google (except `/api/me/account`, `/api/leaderboard/me`, the Google routes, the
  session read and sign-out), and `proxy.ts` sends their page loads to `/connect-google` (leaving
  `/`, `/privacy`, `/terms` open) from a hint cookie the session read keeps.

## Accepted risk (owner, November 20, 2026)

- **An unconfirmed password account registered with someone else's Gmail address.** When the
  Gmail's real owner picks that Google account, its email equals the account's ROTRA email, so they
  are asked **Connect Google to your account?** for that account, and a yes signs them in to it.
  The owner accepts this as built: few of the accounts registered before November 20, 2026 could be
  like this. Nothing extra is checked.

## By design

- **No Google at claim for an already-registered profile.** A registration link for a profile that
  is already registered shows "already registered" and **Sign in** (P-CLAIM), never the form, and a
  person who already has an account can't attach a record through a link
  ([D-2026-11-18-07](../mvp/decisions/2026-11-18.md#d-2026-11-18-07)). They sign in and connect
  Google from Sign-in methods.

## Not built, or not in real mode yet

- The Queue Master seeing "Invited by <name>" on a join request: the Queue join does not save
  `session_join_requests.invite_code_id` yet (the invite card does name the inviter).
- Rate limits and a sign-in audit trail of their own: Supabase's limits apply; the Go API's
  (B-04) replace them.

## In the Go API (track go-sign-in-catch-up)

**Status: built and tested against a fake Google only.** No Google Cloud OAuth client exists, so nothing here has run against
Google. Owner answers (2026-11-23): Go talks to Google itself, the Google email identifies the player, and Google-only logins are not
imported. Everything stays behind `player_google_sign_in`: with the flag off (or missing) every route answers 404.

**What the owner sets up for Go** (no secret goes in the repo):

1. A Google Cloud OAuth client (Web application). Authorized redirect URI: `<player origin>/api/auth/google/callback`, for example
   `https://player.rotra.club/api/auth/google/callback` and `http://localhost:9001/api/auth/google/callback`. The Player app's proxy
   forwards `/api/auth/*` to Go, so the browser returns to the Player app and Go answers. Scopes: `openid`, `email`, `profile` only.
2. Three variables on the Go service (all or none; with only some, or a redirect base that is not an origin, Google stays off and the API logs a warning, it still starts): `GOOGLE_OAUTH_CLIENT_ID`,
   `GOOGLE_OAUTH_CLIENT_SECRET` (secret) and `GOOGLE_OAUTH_REDIRECT_BASE` (the Player app's exact origin, no path). Without them the
   routes exist and Continue with Google answers "unavailable". No Supabase setting is used.
3. The Player app needs `/api/auth` and `/api/claim` in `ROTRA_GO_MOVED_AREAS` (already there for Go sign-in).

| Step | Where (`apps/api/internal/auth/google`) |
|---|---|
| Start: state, PKCE and nonce in a signed 10 minute cookie; answers Google's URL | `google.go` |
| Callback: checks state, exchanges the code, verifies the ID token, decides, signs in or holds, redirects | `google.go`, `oidc.go`, `decide.go` |
| The screen reads what was decided (once); the player's yes; the identity cards | `decide.go`, `identities.go` |
| Claim with Google | `claim.go` and `claim.Finish.GoogleEmail` |
| Google registration from a club or session invite | `internal/auth/register/google.go` |

How it differs from the TypeScript version (all logged in the track's plan):

- **No provider session.** The held Google account (`rotra-player-google-held`) is a signed cookie with the verified email and name,
  never a session. A Go session is issued only after ROTRA's record says Google is connected (`google_email`) or the player says yes,
  so the rule "a session started by Google only counts for an account with Google" holds by construction.
- **The Google email identifies the player.** A Google account that changes its email at Google must be connected again.
- **A login made with Google has no password** (an empty hash). Password sign-in refuses it, and password reset answers
  `signsInWithGoogle` while the flag is on.
- **Google callbacks are rate limited** per IP, once per trip (starting is not counted), under their own counter `google_trip` (100 per 15 minutes, `ROTRA_AUTH_LIMIT_GOOGLE_TRIP_IP`), apart from the sign-in attempts every app's password sign-in shares. Outcome and link are not counted.
- **The cookies are signed** (key derived from the pass signing key); the flow, result and return cookie names are the same.
- **The Admin link's registration** (`/register`, picked city) is not in Go, for password or Google; it stays in the Player app, so
  `/api/register` is not in the moved areas. Google registration moves with the exact-path entry `=/api/register/*/google`; password `/api/register/{clubId}` cannot be separated from `/api/register/google` by a path pattern and stays in the Player app (BL-19).
- **The deadline gate** runs on Go's Player routes as before; Go also keeps the proxy's `rotra-player-google-gate` hint in step on the
  password sign-in and the session read, and Google sign-in, Connect and the player's yes clear it.
