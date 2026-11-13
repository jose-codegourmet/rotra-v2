import type { ComponentMeta } from '@rotra/ui/meta'
export const winRateShareCardMeta = {
  name: 'WinRateShareCard',
  description:
    'Queue’s Share profile images: picture, display name, RTR ID and “Win rate · YEAR” big with games, W and L, then OR and the Profile link.',
  usage: [
    'Inside ShareDialog titled “Share profile”, from the participant profile card on the session page.',
    'ROTRA Player and Admin share the profile with ProfileShareCard (level, position, wins) instead.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.shareFinish (kind profile)',
  },
  docs: ['docs/mockup-changes/2026-11-13-profile-card-open-share.md'],
  related: ['ShareDialog', 'ProfileShareCard', 'ParticipantProfileSheet'],
} satisfies ComponentMeta
