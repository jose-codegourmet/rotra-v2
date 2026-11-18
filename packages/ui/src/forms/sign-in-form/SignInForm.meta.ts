import type { ComponentMeta } from '@rotra/ui/meta'
export const signInFormMeta = {
  name: 'SignInForm',
  description:
    'Player Information sign-in with email, password visibility and recovery. Prototype hints only with prototypeHints (mock data).',
  usage: [
    'Presentational only; containers own mutations and navigation.',
    'Pass legalLinks (the app\'s /terms and /privacy paths) to show "By continuing you agree to the Terms of Service and Privacy Policy." under the card (D-2026-11-17-01).',
    'Pass google (P12, only while the player_google_sign_in flag is on) for Continue with Google, the invite context notice, the "isn\'t connected" warn notice, the divider, Forgot password? beside the Password label and the new footer. Without it the form is unchanged.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/screens/product/modules/player-information/legal.md',
  ],
} satisfies ComponentMeta
