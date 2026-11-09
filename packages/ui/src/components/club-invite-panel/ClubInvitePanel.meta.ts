import type { ComponentMeta } from '@rotra/ui/meta'

export const clubInvitePanelMeta = {
  name: 'ClubInvitePanel',
  description:
    'Club settings › Club invite link: the helper copy, the read-only club invite link with Copy link, Share club invite and Regenerate link, and the "Regenerate the club invite link?" confirm sheet.',
  usage: [
    'Use as the "invite" section of Club settings (/club-settings/invite).',
    'The container owns the copy and regenerate toasts, the new ?k= code, and the Share club invite sheet (the share card); the panel only reports through its callbacks.',
    'The confirm sheet is kept by the panel; pass confirmOpen and onConfirmOpenChange to control it.',
    'It is not SessionLinkCard: there are no session switches here.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Club settings › Club invite link (#club-invite), sheet regenClubInvite',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/mockup-changes/2026-11-09-queue-club-invite-link.md',
  ],
  related: ['SessionLinkCard', 'ClubSettingsMenu', 'ClubIdentityPanel', 'Sheet', 'TextInput'],
} satisfies ComponentMeta
