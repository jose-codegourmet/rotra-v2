import type { ComponentMeta } from '@rotra/ui/meta'
export const signInMeta = {
  name: 'SignIn',
  description:
    'Connects email sign-in in mock or real mode to safe same-app or public Queue return navigation and offline state. With the player_google_sign_in flag on it also connects Continue with Google.',
  usage: [
    'Retains a validated Queue public session destination for a same-tab registration invitation, then returns to it after sign-in without granting club authority.',
    'Real mode uses the existing Player Supabase sign-in; no email delivery.',
    'Passes the public /terms and /privacy paths so the card shows the Terms of Service and Privacy Policy line (D-2026-11-17-01).',
    'Flag on: Continue with Google opens the account picker (mock) through useGooglePicker; signed in goes to returnTo or the profile, same email as a password account holds the pick in the store and opens /connect-google, no ROTRA account shows the "isn\'t connected" notice. Google here never creates an account.',
    'Invite context: /login?returnTo=<invite route>, where the invite route is /register/<clubId>[?session=<slug>&invite=<code>&k=<code>]. It names the club or session ("Sign in to join <club>." / "Sign in to request a spot in <session>.") and is where the player returns after sign-in.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
