import type { ComponentMeta } from '@rotra/ui/meta'

export const editPlayerDetailsFormMeta = {
  name: 'EditPlayerDetailsForm',
  description:
    'Queue Edit details sheet for a guest or unclaimed profile: name and nickname, Email (a guest gets Email (optional) and saving one makes them unclaimed; a saved email is read-only with its note; an older unclaimed record with no email gets a required-looking Email and the Details required notice), Phone (optional) for unclaimed profiles only, and for unclaimed profiles playing style, experience and links that prefill the registration. When given the club-set picture it starts with a Profile picture field (upload, remove, previous picture, a paged character grid) whose changes apply at once, apart from Save details.',
  usage: [
    'Gender (optional): Male, Female or Not given (GenderField, "" is Not given). It sets the match category; the container saves it for guests and unclaimed players. Real mode has no gender column yet, so it is not sent.',
    'Presentational only; the container loads ClubPlayerDetails and saves.',
    "No phone field for a guest. The email can never be changed once saved (D-2026-11-16-04); an email already on a saved player is the container's Same person confirmation, not a form error.",
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
    'docs/mockup-changes/2026-11-16-queue-unclaimed-email-lookup.md',
  ],
  related: ['PersonalDetailsFields', 'ExperienceFields', 'PlayerProfileSheet', 'Avatar', 'Pager'],
} satisfies ComponentMeta
