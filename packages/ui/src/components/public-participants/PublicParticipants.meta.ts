import type { ComponentMeta } from '@rotra/ui/meta'

export const publicParticipantsMeta = {
  name: 'PublicParticipants',
  description:
    'Public masked participant tiles with skill-group rings and open slots: three columns on phones and four wider, capped at three rows with a join prompt. Only a server-verified confirmed Player gets an uncapped roster; the masked numbered waitlist stays public.',
  usage: [
    'fullRoster is supplied only by the authenticated Player projection after checking this session’s roster link; participantCount is the total before the server cap.',
    'Use for the public session Participants tab and its operator preview; pass only the public-safe projection in roster order.',
    'Pass openSlots, finished, acceptJoinRequests and onRequestToJoin from the public page. The callback opens Request to join; it never grants a slot or expands the roster.',
    'The cap hides entries after nine at widths up to 640 px and twelve above that. The fade and join prompt appear only when confirmed participants exceed that width’s cap.',
    'Finished sessions have no open placeholders or Request to join button. Without fullRoster they retain the roster cap and explain that full roster is for confirmed participants. Waitlist tiles remain uncapped and keep admission order.',
    'Skill mix belongs to the Want to play? card; the deprecated skillMix and hasProfile props are ignored during consumer migration.',
    'Use existing roster components for the operator post-session roster with levels and payments.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab (.pgrid.pub, .pub-cap, .pub-more, .wl)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: ['ParticipantCard', 'Avatar', 'JoinRequestCard', 'PublicSessionHero'],
} satisfies ComponentMeta
