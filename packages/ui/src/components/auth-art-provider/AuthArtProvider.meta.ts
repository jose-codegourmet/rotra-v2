import type { ComponentMeta } from '@rotra/ui/meta'

export const authArtProviderMeta = {
  name: 'AuthArtProvider',
  description:
    "Sets the full-bleed background art for every AuthCard below it. Each app wraps its `(auth)` routes once: Queue's Rion courtside, Player's Tara in a ready stance, Admin's arena from above.",
  usage: [
    'Wrap the `(auth)/layout.tsx` children: <AuthArtProvider art="/art/auth/queue-club-login-rion.webp">. It renders no element, so a TopBar placed outside the card stays above the art.',
    'AuthCard can also take `art` directly; the prop wins over the provider.',
    'The art files live in each app\'s public/art/auth/ folder. Never inline the image as base64.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-LOGIN (.login, .login::before); rotra-player.html P-LOGIN; rotra-admin.html A-LOGIN',
  },
  docs: ['docs/mockup-changes/2026-11-19-auth-backgrounds.md'],
  variants: [],
  related: ['AuthCard'],
} satisfies ComponentMeta
