import type { ComponentMeta } from '@rotra/ui/meta'

export const inviteSheetMeta = {
  name: 'InviteSheet',
  description:
    'Gives the operator a link to send a guest (create a ROTRA account) or an unclaimed player (claim their profile).',
  usage: [
    'ROTRA never sends the invite: the operator copies the link and sends it through Messenger, SMS or similar.',
    'Pass link once it is made; while undefined a skeleton shows. offline replaces the link with "Making an invite link needs an internet connection."',
    'The container toasts after onCopy.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Invite sheet (invite(sh))',
  },
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  variants: ['guest', 'unclaimed', 'offline', 'loading'],
  related: ['PlayerProfileSheet', 'SavedPlayerCard'],
} satisfies ComponentMeta
