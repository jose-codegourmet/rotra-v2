/**
 * The Google deadline (owner, November 18, 2026): ONE swappable value. Mock today; it becomes an
 * Admin setting or an environment value later without any screen changing, because screens read it
 * through `useGoogleDeadline`. The mockup's placeholder, December 31, 2026.
 */
export const GOOGLE_SIGN_IN_DEADLINE = {
  /** Last day to connect Google, as a Philippine calendar date. */
  date: '2026-12-31',
  /** The way it is written in copy ("Backup only until …", "Verify your ROTRA account by …"). */
  label: 'December 31, 2026',
} as const

/**
 * Real mode (#922): the one cookie the page may read after the trip to Google. It holds only the
 * key of the screen a Google result is waiting for (`login`, `invite`, `claim`, …), never an email
 * or a token; those stay in httpOnly cookies. Set by the OAuth callback, taken by `takeGoogleReturn`.
 */
export const GOOGLE_RETURN_COOKIE = 'rotra-player-google-return'
