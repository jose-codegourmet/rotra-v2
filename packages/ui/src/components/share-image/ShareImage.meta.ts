import type { ComponentMeta } from '@rotra/ui/meta'

export const shareImageMeta = {
  name: 'ShareImage',
  description:
    'One share image on the fixed dark brand card: the avatar or logo spot and headline on top, the content, and the ROTRA logo at the foot. Story 270 × 480, Facebook post 320 × 400 or Square 320 × 320 on screen; 1080 px wide as a PNG.',
  usage: [
    'Use for every share image except the Session and club invites (those keep ShareCard with its QR).',
    'No grid background, no QR and no “Run the game.” tagline (owner, November 13, 2026).',
    'Mark every text node in the content with data-qr-text, pictures with data-qr-logo="<key>" (pass the key in ShareImagePicker images), so the PNG matches the screen.',
    'footerEnd puts text beside the logo (Queue leaderboard “#1–8 of 24”).',
    'glow="bottom" for Queue images (the prototype\'s .qs-card); Player images keep the default top glow (.sh-card).',
    'Fixed brand colours: it looks the same in both themes.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share sheet › shareCardHTML (.sh-card); Queue .qs-card',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-share-images-no-grid-no-qr.md',
    'docs/mockup-changes/2026-11-13-share-images-no-tagline.md',
  ],
  variants: ['story', 'post', 'square', 'glow: top | bottom'],
  related: ['ShareImagePicker', 'ShareDialog', 'RotraLogo', 'ShareCard'],
} satisfies ComponentMeta
