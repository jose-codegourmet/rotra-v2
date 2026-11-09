import type { ComponentMeta } from '@rotra/ui/meta'

export const publicParticipantTileMeta = {
  name: 'PublicParticipantTile',
  description:
    'Public session participant tile: picture with a skill-group ring, the name and, for registered players seen by a signed-in viewer, the nickname beneath it and a link to the ROTRA profile. The viewer’s own tile carries a You pill and an accent ring.',
  usage: [
    'Used by PublicParticipants for the Participants grid and the Waitlist. Pass plain props from the public read; the tile fetches nothing.',
    'masked is true for guests, unclaimed profiles and every visitor: the name stays masked, the nickname is hidden and the tile never links, even if href is passed.',
    'A registered tile seen by a signed-in viewer sets masked to false, passes the full name, nickname and href (the Player app’s /player/find/<RTR>). The tile is an anchor opened in a new tab with rel="noopener noreferrer", aria-label “NAME · view ROTRA profile”; hover and focus ring the picture in --accent and underline the name.',
    'isViewer adds the You pill (accent background, --on-accent text, 12 px uppercase) and turns the picture ring accent. The viewer’s own registered tile is linked like any other.',
    'waitlistPosition is one-based and supplies both the visible badge and the accessible queue position.',
    'levelLabel is a hover label and accessible text only; contacts and private fields never belong here.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen:
      'Public session page › Participants, Waitlist (pubTile, .pcard.pub, .you-tag, a.pub-link, .wl-av, .wl-n)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicParticipants', 'Avatar', 'ParticipantCard'],
} satisfies ComponentMeta
