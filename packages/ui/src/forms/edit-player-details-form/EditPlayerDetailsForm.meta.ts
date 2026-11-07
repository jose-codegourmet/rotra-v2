import type { ComponentMeta } from '@rotra/ui/meta'

export const editPlayerDetailsFormMeta = {
  name: 'EditPlayerDetailsForm',
  description:
    'Queue Edit details sheet for a guest or unclaimed profile: name and nickname, a phone only when none is on file, and for unclaimed profiles email, playing style, experience and links that prefill the registration.',
  usage: ['Presentational only; the container loads ClubPlayerDetails and saves.'],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.editPlayer (Saved players › profile › Edit details)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-08-queue-edit-player-details.md',
  ],
  related: ['PersonalDetailsFields', 'ExperienceFields', 'PlayerProfileSheet'],
} satisfies ComponentMeta
