import type { ComponentMeta } from '@rotra/ui/meta'
export const connectGoogleMeta = {
  name: 'ConnectGoogle',
  description:
    'The /connect-google route: P-GOOGLE-LINK for a password player who picked a Google account with their email, or P-GOOGLE-REQUIRED for a password-only player after the deadline.',
  usage: [
    'Only while the player_google_sign_in flag is on; with it off the route sends the visitor to /login.',
    'P-GOOGLE-LINK: signed out with a held link (from /login). Connect Google and sign in uses useConfirmGoogleLink and returns to the held returnTo or the profile; Use my password instead goes back to /login with the email filled.',
    'P-GOOGLE-REQUIRED: signed in, no Google, deadline passed (useGoogleRequirement). Connect <tried email> or the picker connects through useConnectGoogle; Sign out ends the session.',
    'Anything else (signed out with nothing held, or a player who already has Google or is before the deadline) is sent on to /login or the profile.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-GOOGLE-LINK / P-GOOGLE-REQUIRED (viewGoogleLink, viewGoogleRequired)',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
