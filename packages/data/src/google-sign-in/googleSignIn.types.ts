import type { MockSession } from '../auth/auth.types'
import type { MyAccount } from '../player-account/playerAccount.types'

/** What Google tells ROTRA after the player picks an account: a name and an email, nothing else. */
export type GoogleIdentity = { email: string; name: string }

/** One line in the Google account picker. A prototype stand-in for Google's own window. */
export type GooglePickerAccount = GoogleIdentity & {
  /** What picking it does in the prototype ("New to ROTRA", "Same email as …"); never shown in real mode */
  hint: string
}

/** Where Continue with Google was pressed. `connect` and `claim` have their own fetchers. */
export type GoogleSignInContext = 'login' | 'register'

/**
 * The result of picking a Google account on P-LOGIN or P-INVITE.
 * - `signed-in`: Google was already connected to a ROTRA account. A session now exists.
 * - `ask-to-connect`: the Google email is a password account's ROTRA email. Show P-GOOGLE-LINK; never
 *   linked silently. `confirmGoogleLink` connects and signs in; "Use my password instead" does nothing.
 * - `not-connected` (login only): no ROTRA account is connected to or uses this Google email. Show
 *   "This Google account isn't connected to ROTRA." Never creates an account. The tried email is held
 *   for **Connect <email>** after the password sign-in (`useGoogleTriedEmail`).
 * - `new-account` (register only): no account uses it; open the Google registration form with it.
 */
export type GoogleSignInOutcome =
  | { outcome: 'signed-in'; session: MockSession; google: GoogleIdentity }
  | { outcome: 'ask-to-connect'; google: GoogleIdentity; playerId: string; playerName: string }
  | { outcome: 'not-connected'; triedEmail: string }
  | { outcome: 'new-account'; google: GoogleIdentity }

/**
 * Connect or Change Google while signed in. `taken`: another ROTRA account already uses this Google
 * email (connected, or as its ROTRA email); nothing changes. The ROTRA email never changes.
 */
export type ConnectGoogleOutcome =
  | { outcome: 'connected'; account: MyAccount }
  | { outcome: 'taken'; email: string }

/** Google registration values: the registration form without the email and password fields. */
export type GoogleRegistrationValues = {
  fullName: string
  nickname: string
  playingStyle: string
  experienceYears: string
  experienceMonths: string
  facebook: string
  instagram: string
  youtube: string
  linkedin: string
  /** Philippine mobile number as typed */
  phone: string
  /** Required for the Admin link (no club); ignored for a club or session invite */
  cityCode?: string
}

export type GoogleRegistrationInput = {
  google: GoogleIdentity
  /** The invite's club; empty for the Admin link */
  clubId?: string | null
  sessionSlug?: string | null
  /** The club invite link's `k`; the server checks it in real mode, like the password registration */
  clubInviteCode?: string | null
  values: GoogleRegistrationValues
}

/**
 * `registered`: the account exists with its email confirmed at once, the player is signed in, and
 * joined the invite's club. `account-match`: the phone or the Google email already belongs to an
 * account; nothing was created.
 */
export type GoogleRegistrationResult =
  | {
      outcome: 'registered'
      session: MockSession
      playerId: string
      rtrId: string
      /** Nickname, or the first word of the full name */
      firstName: string
      clubName: string | null
      sessionSlug: string | null
      sessionTitle: string | null
    }
  | { outcome: 'account-match' }

/**
 * Claim with Google instead of a password. `taken`: the Google email is already on another ROTRA
 * account ("… is already on another ROTRA account. Pick another Google account.").
 */
export type GoogleClaimResult =
  | {
      outcome: 'claimed'
      session: MockSession
      playerId: string
      rtrId: string
      firstName: string
    }
  | { outcome: 'taken'; email: string }

export type GoogleDeadline = {
  /** `YYYY-MM-DD` */
  date: string
  /** "December 31, 2026" */
  label: string
  /** True once the deadline has passed (the development switch in mock mode) */
  passed: boolean
}

/**
 * Where a signed-in player stands: `connected` (Google is on the account), `nudge` (no Google, before
 * the deadline: announcement band, Remind me later allowed), `required` (no Google, after the
 * deadline: P-GOOGLE-REQUIRED; no Remind me later).
 */
export type GoogleRequirementState = 'connected' | 'nudge' | 'required'

export type GoogleRequirement = {
  state: GoogleRequirementState
  deadline: GoogleDeadline | undefined
  /** `nudge` only: the band offers Remind me later, and it hides the band for this visit once pressed */
  canRemindLater: boolean
  /** Remind me later was pressed this visit (always false after the deadline) */
  reminded: boolean
}

/** The viewer's side of an invite landing. */
export type InviteViewerState =
  /** Signed out: Continue with Google, I don't have a Google account, Sign in */
  | { status: 'visitor' }
  /** Signed in and free to go on: Join <club> / Continue to request to join */
  | { status: 'ready'; playerId: string; name: string }
  /** Club invite: already one of the club's saved players ("You're already in <club>.") */
  | { status: 'already-member'; playerId: string; name: string }
  /** Session invite made by this player ("This is your own invite…") */
  | { status: 'own-invite'; playerId: string; name: string }
  /** Session invite: confirmed on the roster ("You're already in <session>.") */
  | { status: 'already-in'; playerId: string; name: string }
  /** Session invite: on the waitlist ("You're already on the waitlist for <session>.") */
  | { status: 'on-waitlist'; playerId: string; name: string; position: number }
  /** Session invite: a request to join is already waiting for the Queue Master */
  | { status: 'request-pending'; playerId: string; name: string }

/** What the invite card shows; `club` and `session` come from the saved club and session. */
export type InviteCardData =
  | { kind: 'admin' }
  | {
      kind: 'club'
      club: { id: string; name: string; initials: string; logoUrl: string | null; city: string }
      memberCount: number
    }
  | {
      kind: 'session'
      club: { id: string; name: string; initials: string; logoUrl: string | null; city: string }
      session: {
        slug: string
        title: string
        startsAt: number
        endsAt: number
        venueName: string
      }
      /** Null for a session link with no (or an unknown) invite code: "You're invited to play" */
      inviter: { playerId: string; name: string; shortName: string } | null
      /** The Queue page the signed-in player continues to: `/s/<slug>?join=1&invite=<code>` */
      continueUrl: string
    }
  | {
      /** The link can't be used: unknown club or session, a wrong club code, or the session has started */
      kind: 'unavailable'
      reason: 'club' | 'session' | 'code' | 'started'
    }

export type InviteLanding = { card: InviteCardData; viewer: InviteViewerState }

/** The parts of an invite link (`/register/<clubId>?session=<slug>&invite=<code>&k=<clubCode>`). */
export type InviteLink = {
  clubId?: string | null
  sessionSlug?: string | null
  /** The session invite's `invite`; one per player and session */
  sessionInviteCode?: string | null
  /** The club invite's `k` */
  clubInviteCode?: string | null
}

/** A player's standing on a session, for the dev stand-in that puts the signed-in player there. */
export type MockInviteStanding = 'none' | 'in' | 'waitlist'

/**
 * Real mode (#922): why the browser is sent to Google. `connect` is a signed-in player adding or
 * changing Google; the others are Continue with Google on P-LOGIN, an invite and a registration link.
 */
export type GoogleRedirectIntent = 'login' | 'register' | 'claim' | 'connect'
