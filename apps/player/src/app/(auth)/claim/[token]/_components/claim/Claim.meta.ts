import type { ComponentMeta } from '@rotra/ui/meta'
export const claimMeta = {
  name: 'Claim',
  description:
    "P-CLAIM and P-CLAIM-STATUS: the registration link's state, then 'Is this you?', the registration form and the welcome, with the wrong-profile stop and the processing check.",
  usage: [
    'After success, consumes a validated pending public session return; claiming never confirms admission.',
    'Only a club-issued link opens this route; public RTR IDs and profile pages never start a claim.',
    'An unknown token shows the expired state, so the page never reveals whether a profile exists.',
    'Flag player_google_sign_in on: after Is this you? the method step "Connect your Google account" (Google only), then the form in Google mode with "← Use another Google account"; completing says "Sign in from now on with Google (<email>)." A Google email already on another account returns to the method step with the error.',
    'P-ONBOARD: the form is step 1 (Your details, fullscreen, no top bar or dock). Continue creates the account and saves the required gender; steps 2 to 4 (OnboardingFlow) follow, then the done page. Back on step 2 reopens Your details.',
    "'This isn't me' writes nothing; completing signs the player in.",
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewClaim, viewClaimDone, ACT.claimYes/claimNo/claimBack/claimCheck',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/business_logic/product/player-information/modules/identity/flow/claim-and-recover.md',
  ],
  variants: [
    'loading',
    'check',
    'wrong',
    'method',
    'form',
    'onboarding',
    'claimed',
    'expired',
    'processing',
    'done',
  ],
} satisfies ComponentMeta
