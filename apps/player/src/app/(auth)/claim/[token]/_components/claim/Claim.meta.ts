import type { ComponentMeta } from '@rotra/ui/meta'
export const claimMeta = {
  name: 'Claim',
  description:
    "P-CLAIM and P-CLAIM-STATUS: the registration link's state, then 'Is this you?', the registration form and the welcome, with the wrong-profile stop and the processing check.",
  usage: [
    'Only a club-issued link opens this route; public RTR IDs and profile pages never start a claim.',
    'An unknown token shows the expired state, so the page never reveals whether a profile exists.',
    "'This isn't me' writes nothing; completing signs the player in.",
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'viewClaim, viewClaimDone, ACT.claimYes/claimNo/claimBack/claimCheck',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/business_logic/product/player-information/modules/identity/flow/claim-and-recover.md',
  ],
  variants: ['loading', 'check', 'wrong', 'form', 'claimed', 'expired', 'processing', 'done'],
} satisfies ComponentMeta
