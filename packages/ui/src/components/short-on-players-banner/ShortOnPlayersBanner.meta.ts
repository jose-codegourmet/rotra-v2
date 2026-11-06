import type { ComponentMeta } from '@rotra/ui/meta'

export const shortOnPlayersBannerMeta = {
  name: 'ShortOnPlayersBanner',
  description:
    'Short on players: a warning notice above Courts on the live console\'s Session view, e.g. "7 players present: enough for 1 doubles court. 3 sit out each game." With both formats on it reads "enough for 1 doubles court and 1 singles court"; with too few for any game, "3 players present: not enough for a doubles game."',
  usage: [
    "Show it only while the present players who aren't busy can't fill every free open court with the session's standard format; the container decides and hides it once they can (or no court is free).",
    'The container counts all present players against the open courts, doubles first (4 a court) then singles (2 a court), and passes present, doublesCourts, singlesCourts and sitOut. The banner never computes them.',
    'Pass standardFormat "singles" for a singles-only session so "not enough for a singles game." reads right; sitOut 0 drops the second sentence.',
    'It has no buttons. Free courts that can\'t get a match say "Not enough free players." on their CourtCard (notEnoughFreePlayers).',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Live console › Session view › shortOfPlayers() (notice.warn above Courts)',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md',
    'docs/business_logic/product/queue/modules/queueing/README.md#short-on-players',
  ],
  related: ['Notice', 'CourtCard', 'CourtFillSwitch'],
} satisfies ComponentMeta
