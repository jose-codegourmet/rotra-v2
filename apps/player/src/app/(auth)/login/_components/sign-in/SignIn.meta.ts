import type { ComponentMeta } from '@rotra/ui/meta'
export const signInMeta = {
  name: 'SignIn',
  description:
    'Connects email sign-in in mock or real mode to safe same-app or public Queue return navigation and offline state.',
  usage: [
    'Retains a validated Queue public session destination for a same-tab registration invitation, then returns to it after sign-in without granting club authority.',
    'Real mode uses the existing Player Supabase sign-in; no email delivery.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LOGIN / P-FORGOT / P-RESET',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
} satisfies ComponentMeta
