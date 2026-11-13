import type { ComponentMeta } from '@rotra/ui/meta'

export const shareDialogMeta = {
  name: 'ShareDialog',
  description:
    'The share dialog shell for every Share button except the Session and club invites: the wide sheet at most 680 px wide (full width on phones) with Close as its only footer button.',
  usage: [
    'Put a ShareImagePicker inside; show a Skeleton, ErrorState or Notice there while its data loads.',
    'Titles: “Share profile”, “Share rank”, “Share result”, “Share games”, “Share your finish”, “Share leaderboard”.',
    'Session invite and club invite sheets keep their own QR card (ShareCard, ClubInviteCard); do not use this for them.',
    'PlayerShareSheet is this dialog under its older name.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Share sheet (.sheet.wide.sh-dlg)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-share-dialog-big.md',
    'docs/mockup-changes/2026-11-13-share-dialog-carousel.md',
  ],
  related: ['ShareImagePicker', 'Sheet', 'PlayerShareSheet'],
} satisfies ComponentMeta
