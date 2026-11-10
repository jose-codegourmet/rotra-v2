import type { ComponentMeta } from '@rotra/ui/meta'

export const editPlayerDetailsFormMeta = {
  name: 'EditPlayerDetailsForm',
  description:
    'Queue Edit details sheet for a guest or unclaimed profile: name and nickname, a phone only when none is on file, and for unclaimed profiles email, playing style, experience and links that prefill the registration. When given the club-set picture it starts with a Profile picture field (upload, remove, previous picture, a paged character grid) whose changes apply at once, apart from Save details.',
  usage: [
    'Presentational only; the container loads ClubPlayerDetails and saves.',
    'Picture props (picture, characters, onPictureChange, onPictureRemove, onPicturePrevious, pictureError, picturePending) are optional; the picture is never part of the Save details payload.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.editPlayer (Saved players › profile › Edit details)',
  },
  docs: [
    'docs/screens/product/modules/queue/players-roster.md',
    'docs/mockup-changes/2026-11-08-queue-edit-player-details.md',
    'docs/mockup-changes/2026-11-09-queue-club-set-player-pictures.md',
  ],
  related: ['PersonalDetailsFields', 'ExperienceFields', 'PlayerProfileSheet', 'Avatar', 'Pager'],
} satisfies ComponentMeta
