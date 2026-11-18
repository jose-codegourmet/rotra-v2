/**
 * Google sign-in keys (P12). `triedEmail` and `remindLater` sit under the `auth` root on purpose:
 * `useSignIn` and `useAccountScope` keep that root across the account change, and the tried Google
 * email has to survive the password sign-in that comes right after it.
 */
export const googleSignInKeys = {
  all: ['google-sign-in'] as const,
  /** The deadline and whether it has passed; one mock value, a dev switch flips it */
  deadline: () => ['google-sign-in', 'deadline'] as const,
  /** An invite landing for one link and one viewer (null = signed out) */
  invite: (link: string, viewerId: string | null) =>
    ['google-sign-in', 'invite', link, viewerId] as const,
  /** The Google email tried on P-LOGIN that isn't connected to ROTRA (held for this visit) */
  triedEmail: () => ['auth', 'google', 'tried-email'] as const,
  /** Remind me later on the announcement band (held for this visit) */
  remindLater: () => ['auth', 'google', 'remind-later'] as const,
}
