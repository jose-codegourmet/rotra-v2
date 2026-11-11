import type { ComponentMeta } from '@rotra/ui/meta'

export const myNightCardMeta = {
  name: 'MyNightCard',
  description:
    "The My night card on the public session page for a signed-in player: where they stand tonight, games played with Won and Lost, and their own actions (I'm here, I'm leaving, I can't make it, Request a match, Invite).",
  usage: [
    'Pass onStepDown for Move me to the waitlist (#735); pass inMatch while the player is on court, playing or in a queued match: the button is then hidden. Never shown once finished or while waitlisted.',
    'Pass stage: waitlisted, before-start, live-not-present, live-present or finished. The caller maps session and roster state to the stage and the plain props; the card fetches nothing.',
    'Live and present: games, won, lost and minimum feed the stats panel. Leave minimum at 0 when the session has none (no bar). A courtLabel puts the player on court and highlights the card.',
    'canInvite is true only while the session is Prepared and requests are on; the card shows Invite only for waitlisted and before-start stages.',
    'Guests do not get this card; the guest nudge is a separate component.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Public session page › My night card',
  },
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/players/README.md',
  ],
  variants: ['waitlisted', 'before-start', 'live-not-present', 'live-present', 'finished'],
  related: ['Card', 'Button', 'ProgressBar', 'Notice'],
} satisfies ComponentMeta
