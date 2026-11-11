import type { ComponentMeta } from '@rotra/ui/meta'

export const publicParticipantTileMeta = {
  name: 'PublicParticipantTile',
  description:
    'Public session participant tile: picture with a skill-group ring, the name and, for registered players seen by a signed-in viewer, the nickname beneath it; for signed-in viewers every tile is a button that opens the profile card (#731). The viewer’s own tile carries a You pill and an accent ring.',
  usage: [
    'Used by PublicParticipants for the Participants grid and the Waitlist. Pass plain props from the public read; the tile fetches nothing.',
    'masked is true for guests, unclaimed profiles, always-private players and every visitor: the name stays masked and the nickname is hidden.',
    'A registered tile seen by a signed-in viewer sets masked to false and passes the full name and nickname.',
    'onOpen (signed-in viewers only, masked tiles included) makes the tile a button with aria-label “NAME · view profile”, or “NAME (you) · view your profile” on the viewer’s own tile; hover and focus ring the picture in --accent and underline the name. Without onOpen the tile is plain (visitors).',
    'isViewer adds the You pill (accent background, --on-accent text, 12 px uppercase) and turns the picture ring accent.',
    'waitlistPosition is one-based and supplies both the visible badge and the accessible queue position.',
    'levelLabel is a hover label and accessible text only; contacts and private fields never belong here.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › Participants, Waitlist (pubTile, .pcard.pub, .you-tag, button.pub-link, .wl-av, .wl-n)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicParticipants', 'Avatar', 'ParticipantCard', 'ParticipantProfileSheet'],
} satisfies ComponentMeta
