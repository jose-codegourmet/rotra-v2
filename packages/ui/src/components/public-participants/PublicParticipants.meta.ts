import type { ComponentMeta } from '@rotra/ui/meta'

export const publicParticipantsMeta = {
  name: 'PublicParticipants',
  description:
    'The public page\'s Participants tab: a grid of confirmed people (picture or initials, name, "Has a ROTRA profile"), then "Waitlist · N" as a numbered list of names when anyone is waiting, or "Players have not been added yet." when the roster is empty.',
  usage: [
    'Use for the Participants tab of the public session page (Q-PUBLIC-PARTICIPANTS), in the operator preview and on the real public page.',
    'Pass the public projection only: id, name, picture and hasProfile. The prop types have no phone, email, level, presence, games, notes, identity-verification state or Off Day.',
    'Cards are not links. For operator views of the roster use RosterRow or SavedPlayerCard.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab (.pgrid, .pub-wait)',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/README.md',
  ],
  related: ['ParticipantCard', 'PublicSessionDetails', 'PublicSessionHero', 'EmptyState'],
} satisfies ComponentMeta
