import type { ComponentMeta } from '@rotra/ui/meta'

export const rotraLogoMeta = {
  name: 'RotraLogo',
  description:
    'The ROTRA logo artwork (Full and Mini, Dark BG and Light BG). It replaces the “ROTRA” text wordmark everywhere; its accessible name is “ROTRA”.',
  usage: [
    'Top bars: variant="responsive" at 26 px tall (Full above 420 px, the Mini symbol at 420 px and narrower), next to the app name.',
    'Sign-in pages: the Full logo at 52 px.',
    'The theme picks the artwork: the Dark BG files in the dark theme, the Light BG files in the light theme.',
    'Share images and the Session QR card are fixed dark: tone="dark" (20 px on share images, 18 px on the Session QR card). That tone is drawn into downloaded PNGs.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'LOGO, rotraLogo(), rotraLogoDark() and .rlogo (top bar, sign-in, share images)',
  },
  docs: ['docs/mockup-changes/2026-11-13-rotra-logo.md'],
  variants: ['full', 'mini', 'responsive', 'theme', 'dark'],
  related: ['TopBar', 'AuthCard', 'PublicAccountBar', 'ShareImage', 'ShareCard'],
} satisfies ComponentMeta
