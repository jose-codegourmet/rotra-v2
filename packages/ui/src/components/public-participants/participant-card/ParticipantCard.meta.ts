import type { ComponentMeta } from '@rotra/ui/meta'

export const participantCardMeta = {
  name: 'ParticipantCard',
  description:
    'Plain centered public tile: masked name below a picture or initials with a 5 px skill-group ring and 4 px gap. Waitlist tiles dim the picture and add a queue-number badge.',
  usage: [
    'Used by PublicParticipants for confirmed and waitlisted players; not a link or button.',
    'Pass only masked public names, pictureUrl, skillGroup and levelLabel from the public read. The level is a hover label and accessible text; contacts and private fields never belong here.',
    'waitlistPosition is one-based and supplies both the visible badge and accessible queue position.',
    'hasProfile is deprecated and ignored. Use RosterRow or SavedPlayerCard for operator roster details.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab (.pcard.pub, .wl-av, .wl-n)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicParticipants', 'Avatar', 'RosterRow'],
} satisfies ComponentMeta
