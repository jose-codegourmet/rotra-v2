import type { ComponentMeta } from '@rotra/ui/meta'

export const publicParticipantsMeta = {
  name: 'PublicParticipants',
  description:
    'Public participant tiles (PublicParticipantTile) with skill-group rings and open slots: three columns on phones and four wider, capped at three rows with a join prompt. Any signed-in viewer gets an uncapped list; visitors stay capped. The numbered waitlist is always uncapped.',
  usage: [
    'uncapped is true for any signed-in viewer (fullRoster is a deprecated alias); participantCount is the total before the server cap and the tab count always shows it in full.',
    'Each entry may carry nickname, masked (default true), isViewer and href; they pass straight to PublicParticipantTile. Registered tiles for a signed-in viewer pass masked false, the full name, nickname and /player/find/<RTR> href; guest, unclaimed and visitor tiles stay masked and unlinked.',
    'Use for the public session Participants tab and its operator preview; pass only the public-safe projection in roster order.',
    'Pass openSlots, finished, acceptJoinRequests and onRequestToJoin from the public page. The callback opens Request to join; it never grants a slot or expands the roster.',
    'The cap hides entries after nine at widths up to 640 px and twelve above that. The fade and join prompt appear only when confirmed participants exceed that width’s cap.',
    'Finished sessions have no open placeholders or Request to join button. Without uncapped they retain the roster cap and explain that full roster is for confirmed participants. Waitlist tiles remain uncapped and keep admission order.',
    'Skill mix belongs to the Want to play? card; the deprecated skillMix and hasProfile props are ignored during consumer migration.',
    'Use existing roster components for the operator post-session roster with levels and payments.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public page › viewPublic() › Participants tab (.pgrid.pub, .pub-cap, .pub-more, .wl)',
  },
  docs: ['docs/screens/product/modules/queue/public-session.md'],
  related: [
    'PublicParticipantTile',
    'ParticipantCard',
    'Avatar',
    'JoinRequestCard',
    'PublicSessionHero',
  ],
} satisfies ComponentMeta
