import type { ComponentMeta } from '@rotra/ui/meta'

export const inviteSheetMeta = {
  name: 'InviteSheet',
  description:
    'Gives the operator a link to send a guest (create a ROTRA account) or an unclaimed player saved by this club with a phone ("Your club saved them with a phone. This link lets them turn that record into a ROTRA account with their phone and email, …").',
  usage: [
    'Guest registration keeps the club guest record unlinked; a separate linking invitation is required.',
    'ROTRA never sends the invite: the operator copies the link and sends it through Messenger, SMS or similar.',
    'Pass link once it is made; while undefined a skeleton shows. offline replaces the link with "Making an invite link needs an internet connection."',
    'The container toasts after onCopy.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Invite sheet (invite(sh))',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/mockup-changes/2026-11-11-queue-club-only-unclaimed.md',
  ],
  variants: ['guest', 'unclaimed', 'offline', 'loading'],
  related: ['PlayerProfileSheet', 'SavedPlayerCard'],
} satisfies ComponentMeta
