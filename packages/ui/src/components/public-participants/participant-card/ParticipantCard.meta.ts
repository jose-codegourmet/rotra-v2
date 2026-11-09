import type { ComponentMeta } from '@rotra/ui/meta'

export const participantCardMeta = {
  name: 'ParticipantCard',
  description:
    'Thin wrapper over PublicParticipantTile for the plain masked tile: masked name below a picture or initials with a 5 px skill-group ring and 4 px gap. Waitlist tiles dim the picture and add a queue-number badge.',
  usage: [
    'Used by the operator record Public page tab; always masked, never a link, nickname or You pill. PublicParticipants uses PublicParticipantTile directly.',
    'Pass only masked public names, pictureUrl, skillGroup and levelLabel from the public read. The level is a hover label and accessible text; contacts and private fields never belong here.',
    'waitlistPosition is one-based and supplies both the visible badge and accessible queue position.',
    'hasProfile is deprecated and ignored. Use RosterRow or SavedPlayerCard for operator roster details.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab (.pcard.pub, .wl-av, .wl-n)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicParticipantTile', 'PublicParticipants', 'Avatar', 'RosterRow'],
} satisfies ComponentMeta
