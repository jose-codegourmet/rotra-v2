/**
 * Cookie names for Google sign-in on the Player app (D-2026-11-16-01, #922). No database or provider
 * access here, so `proxy.ts` can import it. None of these is a session: the Supabase session cookie
 * stays `authCookieName('player')`.
 */

/** httpOnly, 10 minutes: where Continue with Google was pressed (`intent`, `key`, `returnTo`). */
export const GOOGLE_FLOW_COOKIE = 'rotra-player-google-flow'
/**
 * httpOnly, 10 minutes: what the callback decided, for the screen that started it. Display only
 * (an outcome and the Google name and email to show). No server decision ever trusts it.
 */
export const GOOGLE_RESULT_COOKIE = 'rotra-player-google-result'
// The page-readable marker (`GOOGLE_RETURN_COOKIE`, only a screen key) lives in
// `@rotra/data/google-sign-in/config`, because the browser reads it too.
/**
 * httpOnly, 10 minutes: the provider session Google just returned, held apart from the sign-in
 * cookie while the player answers **Connect Google to your account?** or fills the registration
 * form. It is verified with the provider every time it is read.
 */
export const GOOGLE_PENDING_ACCESS_COOKIE = 'rotra-player-google-pending-at'
export const GOOGLE_PENDING_REFRESH_COOKIE = 'rotra-player-google-pending-rt'
/**
 * httpOnly navigation hint for `proxy.ts` (which has no database): `1` while the signed-in player
 * has no Google account and the flag is on. Set and cleared by the session read and the password
 * sign-in. Not a security boundary: Route Handlers check the real state.
 */
export const GOOGLE_GATE_COOKIE = 'rotra-player-google-gate'

/** Pages a password-only player may still open after the deadline (as `GoogleRequiredGate`). */
export const GOOGLE_GATE_OPEN_PATHS = ['/', '/connect-google', '/privacy', '/terms']
