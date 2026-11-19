# Google sign-in for players: owner setup (#896) and how the code uses Supabase Auth

**Last verified:** 2026-11-18. **Status:** real mode is **written but not run against Google**: no
sign-in has been tried, because the Google Cloud OAuth client and the Supabase provider (#896) are
not set up yet. Decision: [D-2026-11-16-01](../mvp/decisions/2026-11-16.md#d-2026-11-16-01). Ticket: #922.
Built on Supabase Auth in the Player app's real mode; it moves to the Go API with B-04 (#875).

Everything here is off while the platform feature flag `player_google_sign_in` is off.

## What the owner sets up (no secret goes in the repo)

1. **Apply the migration first.** `packages/db/prisma/migrations/20261118000200_player_google_sign_in`
   adds `player_accounts.google_email` and `google_linked_at`. The Player app reads these columns on
   every signed-in request, flag on or off, so the code must not be deployed before the migration
   is applied.
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
| Claim with Google | `…/api/claim/[token]/google` |
| Invite card and the viewer's standing | `…/api/invites/[clubId]` |
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
- **Deadline gate:** the date is the one value in
  `packages/data/src/google-sign-in/googleSignIn.config.ts`. After it, Route Handlers refuse a
  player with no Google (except `/api/me/account`, `/api/leaderboard/me`, the Google routes, the
  session read and sign-out), and `proxy.ts` sends their page loads to `/connect-google` (leaving
  `/`, `/privacy`, `/terms` open) from a hint cookie the session read keeps.

## Not built, or not in real mode yet

- Registration from the **Admin link** (no club): an RTR ID needs a creating club today, as with
  password registration in real mode.
- The **inviting player** on a session invite: session invite codes are not stored, so the card
  never names an inviter.
- Rate limits and a sign-in audit trail of their own: Supabase's limits apply; the Go API's
  (B-04) replace them.
