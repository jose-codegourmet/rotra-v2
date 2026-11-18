import type { ComponentMeta } from '@rotra/ui/meta'

export const playerAccountRowMeta = {
  name: 'PlayerAccountRow',
  description:
    'A ROTRA player as a row: avatar, full name and one muted line (the RTR ID or the email).',
  usage: [
    'P-GOOGLE-LINK shows the name and RTR ID (mono); P-GOOGLE-REQUIRED shows the name and email.',
    'Long names and emails wrap.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-GOOGLE-LINK, P-GOOGLE-REQUIRED (.gid with avatar)',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  variants: ['WithRtrId', 'WithEmail', 'LongName'],
  related: ['GoogleIdentityRow', 'Avatar'],
} satisfies ComponentMeta
