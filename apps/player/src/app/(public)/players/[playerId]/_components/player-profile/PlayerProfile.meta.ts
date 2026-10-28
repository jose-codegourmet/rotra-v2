import type { ComponentMeta } from '@rotra/ui/meta'
export const playerProfileMeta = {
  name: 'PlayerProfile',
  description:
    'P-PUBLIC-PROFILE and P-OWN-PROFILE: identity, shared rank, eligibility, recent games and About; the owner also gets Edit profile, My player ID, the private account panel, Add details and Sign out.',
  usage: [
    'Ownership is checked before anything private renders: visitors never mount AccountPanel or request useMyAccount.',
    'Sign out has no confirmation dialog; D-SIGN-OUT belongs to the club account.',
    'My player ID and Privacy and contact routes are built in P04.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'Profile (viewProfile, privatePanel, ACT.copyId, ACT.signOut)',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md',
    'docs/screens/product/modules/player-information/ranking-history.md',
  ],
  variants: ['public', 'own', 'loading', 'not-found', 'error', 'cached', 'updating'],
} satisfies ComponentMeta
