import type { ComponentMeta } from '@rotra/ui/meta'

export const announcementBandMeta = {
  name: 'AnnouncementBand',
  description:
    'The yellow "ROTRA announcement" band at the top of every Player page while the signed-in player isn\'t verified. A message, one or two actions, and Remind me later; after the deadline the bottom border is thicker and Remind me later is gone.',
  usage: [
    'Put it in the same slot as EmailConfirmBanner, as a second band under the header.',
    'Pass verification for the reminder copy and progress, or children for a custom message. Pass the buttons as actions and onRemindLater to show Remind me later.',
    'The deadline is passed in already formatted. Set afterDeadline once it has passed.',
    'Uses the --ann-* tokens (yellow), distinct from the amber warn notices.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Announcement band (gRequiredBand, .band-ann)',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-16-player-google-sign-in.md',
  ],
  variants: ['before-deadline', 'after-deadline', 'one-action', 'two-actions'],
  related: ['EmailConfirmBanner', 'Notice', 'GoogleButton'],
} satisfies ComponentMeta
