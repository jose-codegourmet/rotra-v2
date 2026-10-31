import type { ComponentMeta } from '@rotra/ui/meta'

export const publicSessionHeroMeta = {
  name: 'PublicSessionHero',
  description:
    'The top of the public session page: "Date · start–end" in the accent colour, the session title, and the club logo or initials with its name labelled Organizer, plus a "Happening now" or "Finished" chip.',
  usage: [
    'Use once at the top of the public session page (Q-PUBLIC-DETAILS / Q-PUBLIC-PARTICIPANTS), in the operator preview and on the real public page alike.',
    'state "live" shows Happening now, "finished" shows Finished, "upcoming" (prepared) shows no chip. Never show a chip for invalid sessions here; the page has no results section for them.',
    'The props carry public fields only: no cost, roster, notes or operator state. Use SessionRecordHeader for the operator-only session record.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › .pub-hero',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/README.md',
  ],
  variants: ['live', 'finished', 'upcoming'],
  related: ['PublicPreviewBanner', 'PublicSessionDetails', 'PublicParticipants', 'Avatar', 'Chip'],
} satisfies ComponentMeta
