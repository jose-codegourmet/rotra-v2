import type { ComponentMeta } from '@rotra/ui/meta'

export const googleInviteMeta = {
  name: 'GoogleInvite',
  description:
    'P-INVITE, the Google registration form, P-JOIN-CLUB and P-JOIN-SESSION: what /register, /register/[clubId] and /register/[clubId]?session=<slug>&invite=<code> show while the player_google_sign_in flag is on. GuestRegistration renders it in place of the email + password sign-up.',
  usage: [
    "A signed-out visitor sees the invite card (club, session or Admin) and Continue with Google, I don't have a Google account and Sign in (to /login?returnTo=<this route>).",
    'A new Google account opens the existing ClaimForm in Google mode; success is the existing Registration complete page (AccountLinkStatus) with "You sign in with Google (<email>).".',
    'When clubs saved the Google email as an unclaimed player (D-2026-11-16-04): more than one opens IdentityPicker first (a pick becomes identityRecordId; Cancel returns to the invite), one skips it; both open the Google form with the name and nickname filled in, the pickedIdentity or emailMatch notice and no City or province field. Registration complete shows the joined records.',
    'A Google email already on an account goes to P-GOOGLE-LINK on /connect-google (the pending link carries this route as returnTo) or, when Google is already connected, signs in and goes on to the join step.',
    "A signed-in player sees P-JOIN-CLUB or P-JOIN-SESSION. Reading an invite never joins anyone; a session confirmation does not make the player one of the club's saved players.",
    'request-pending (not in the mockup) shows the plain ready state: Continue to request to join opens the Queue page, which shows the pending request.',
    'The signed-in /register (Admin link) sends the player to their profile.',
  ],
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: [
    'InviteCard',
    'GoogleChooseCard',
    'InviteSignedInCard',
    'ClaimForm',
    'IdentityPicker',
    'AccountLinkStatus',
  ],
} satisfies ComponentMeta
