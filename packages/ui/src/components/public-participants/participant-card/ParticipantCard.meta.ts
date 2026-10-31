import type { ComponentMeta } from '@rotra/ui/meta'

export const participantCardMeta = {
  name: 'ParticipantCard',
  description:
    'One confirmed person on the public Participants grid: profile picture or initials, name, and "Has a ROTRA profile" for registered and unclaimed players. Guests get initials and no label.',
  usage: [
    'Used by PublicParticipants for every confirmed player; not a link and not a button.',
    'Props carry only public fields: name, picture and whether a ROTRA profile exists. Use SavedPlayerCard or RosterRow for operator views that show level, presence or identity details.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab (.pgrid > .pcard)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['PublicParticipants', 'Avatar', 'SavedPlayerCard'],
} satisfies ComponentMeta
