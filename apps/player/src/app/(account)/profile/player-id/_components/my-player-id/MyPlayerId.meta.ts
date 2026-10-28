import type { ComponentMeta } from '@rotra/ui/meta'
export const myPlayerIdMeta = {
  name: 'MyPlayerId',
  description:
    "P-ID-QR container: the signed-in player's RTR ID as a QR code and large text, with Copy ID and 'What the ID means'.",
  usage: [
    'Signed-out visitors never reach it: proxy.ts sends /profile/* to sign-in with returnTo.',
    "Copy ID toasts 'Player ID copied', or selects the ID when the clipboard is blocked.",
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'My player ID (viewId)' },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  variants: ['loading', 'error', 'ready', 'offline'],
} satisfies ComponentMeta
