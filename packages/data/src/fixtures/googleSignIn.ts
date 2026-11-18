import type { GooglePickerAccount, InviteLink } from '../google-sign-in/googleSignIn.types'
import { publicSlugFor } from '../queue-session/queueSession.rules'
import { clubs, DEMO_CLUB_ID } from './clubs'

// Fictional Google accounts for the picker (the prototype's SHEETS.gpick stand-in for Google's own
// window), matched to the private account fixtures in playerAccounts.ts. Real mode redirects to
// Google instead and never reads this list.
//
// Outcomes (login = P-LOGIN, register = P-INVITE, connect = signed in, claim = /claim/claim-raymark):
// - Jasper's Gmail    login → signed in (Google already connected, password also works)
// - Emji              login → signed in (Google only, no password); Forgot password for emji@example.com → Google outcome
// - Dalton            login/register → ask to connect (same email as his password account); connect as another player → taken
// - Karl              same as Dalton
// - Mikee's Gmail     login → not connected (tried email kept); sign in with Mikee's password, then Connect it
// - Ana               login → not connected; register → new account; connect → connected; claim → claimed
// - Jose's Gmail      connect as Jose → connected with a different email; login → not connected
// - Raymark's Gmail   claim → claimed
// - Jomar             register → one club saved this email (unclaimed): its details prefill, no picker
// - Paolo Mendoza     register → two clubs saved this email (unclaimed): the identity picker
export const googlePickerAccounts: GooglePickerAccount[] = [
  { email: 'ana.reyes@gmail.com', name: 'Ana Reyes', hint: 'New to ROTRA' },
  {
    email: 'jasper.plays@gmail.com',
    name: 'Jasper',
    hint: "Already connected to Jasper's ROTRA account",
  },
  {
    email: 'emji@example.com',
    name: 'Emji',
    hint: "Connected to Emji's ROTRA account (Google only, no password)",
  },
  { email: 'dalton@example.com', name: 'Dalton', hint: "Same email as Dalton's password account" },
  { email: 'karl@example.com', name: 'Karl', hint: "Same email as Karl's password account" },
  {
    email: 'mikee.plays@gmail.com',
    name: 'Mikee Abellana',
    hint: "Mikee's personal Gmail, not his ROTRA email",
  },
  {
    email: 'jose.plays@gmail.com',
    name: 'Jose',
    hint: "Jose's personal Gmail, not his ROTRA email",
  },
  {
    email: 'raymark.plays@gmail.com',
    name: 'Raymark',
    hint: "Raymark's Gmail, for the club-created profile link",
  },
  {
    email: 'jomar.delacruz@example.com',
    name: 'Jomar Dela Cruz',
    hint: 'One club saved this email (unclaimed)',
  },
  {
    email: 'paolo.mendoza@example.com',
    name: 'Paolo Mendoza',
    hint: 'Two clubs saved this email (unclaimed)',
  },
]

/** Sign-in examples for Google, beside `signInExamples` for the password form. */
export const googleSignInExamples = {
  /** Google already connected: signs in */
  connected: 'jasper.plays@gmail.com',
  /** Google-only account (no password) */
  googleOnly: 'emji@example.com',
  /** Same email as a password account: ask once */
  sameEmail: 'dalton@example.com',
  /** A different email: not signed in, tried email kept; sign in with `mikeePassword` first */
  differentEmail: 'mikee.plays@gmail.com',
  mikeePassword: { email: 'mikee.abellana@example.com', password: 'prototype' },
  /** No ROTRA account at all */
  unknown: 'ana.reyes@gmail.com',
  /** Used by another ROTRA account: refused when someone else connects it */
  taken: 'emji@example.com',
  /** Forgot password for a Google-only account */
  forgotGoogleOnly: 'emji@example.com',
  /** An email one club saved as an unclaimed player: registering claims that record */
  unclaimedOneClub: 'jomar.delacruz@example.com',
  /** An email two clubs saved as an unclaimed player: registering opens the identity picker */
  unclaimedTwoClubs: 'paolo.mendoza@example.com',
  /** A password player with no Google yet (the deadline gate) */
  passwordOnly: { email: 'jose@example.com', password: 'prototype' },
}

const DEMO_CLUB = clubs.find((club) => club.id === DEMO_CLUB_ID)
const OTHER_CLUB = clubs.find((club) => club.id !== DEMO_CLUB_ID)
if (!DEMO_CLUB?.inviteCode || !OTHER_CLUB?.inviteCode)
  throw new Error('Missing invite club fixtures.')

/** The seeded Session invite code (Jose's, for tonight's session; mock store `sessionInviteCodes`). */
export const TONIGHT_SESSION_SLUG = publicSlugFor('s-tonight')
export const TONIGHT_JOSE_INVITE_CODE = 'k7m2p9qw'

/**
 * The invite links the Player app opens, as `useInviteLanding` input. Sign in as the noted player to
 * reach the signed-in states.
 * - `club` / `otherClub`: club invites. Jose is already a saved player of `club` ("already a member")
 *   and not of `otherClub` ("ready to join").
 * - `sessionWithInviter`: a Session invite made by Jose. As Jose: "own invite". As someone else: ready.
 * - `sessionNoInviter`: the session link without a code: "You're invited to play".
 * - `admin`: the Admin link (no club): "Create your ROTRA account".
 * - "Already in" and "on the waitlist" come from the saved roster and waitlist; the dev stand-in
 *   `useSetMockInviteStanding` puts the signed-in player there so each state is reachable.
 */
export const inviteLinkFixtures = {
  club: { clubId: DEMO_CLUB.id, clubInviteCode: DEMO_CLUB.inviteCode },
  otherClub: { clubId: OTHER_CLUB.id, clubInviteCode: OTHER_CLUB.inviteCode },
  sessionWithInviter: {
    clubId: DEMO_CLUB.id,
    sessionSlug: TONIGHT_SESSION_SLUG,
    sessionInviteCode: TONIGHT_JOSE_INVITE_CODE,
  },
  sessionNoInviter: { clubId: DEMO_CLUB.id, sessionSlug: TONIGHT_SESSION_SLUG },
  admin: {},
} satisfies Record<string, InviteLink>
