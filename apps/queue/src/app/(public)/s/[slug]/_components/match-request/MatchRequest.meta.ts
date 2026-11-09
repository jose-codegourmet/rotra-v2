import type { ComponentMeta } from '@rotra/ui/meta'

export const matchRequestMeta = {
  name: 'MatchRequest',
  description:
    'Q-PUBLIC-DETAILS (My night › Request a match) container: MatchRequestSheet with PlayerPickerSheet (matchRequest) on top, wired to useMatchRequestOptions and useSendMatchRequest.',
  usage: [
    'Opened by Request a match on the My night card (a present, confirmed, signed-in Player in a live session). The format starts on the first allowed one (2 v 2 by default) and every spot on Anyone each time the sheet opens; picks persist while it stays open, also across the picker. The picker lists present players other than the viewer with games, level, waiting time and court from useMatchRequestOptions.',
    'Send request toasts "Match request sent" and closes; My night then shows "Match request sent · the QM decides" with Cancel (Match request cancelled). With no format allowed the My night button, or Send request if the sheet is open, toasts "This session isn\'t taking match requests". A refused send keeps the sheet open and shows the reason in it.',
    'useRequestMatchAction gives MyNight its onRequestMatch: it opens the sheet, or toasts when the session takes no requests.',
  ],
  docs: [
    'docs/screens/product/modules/queue/public-session.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['MatchRequestSheet', 'PlayerPickerSheet', 'MyNight'],
} satisfies ComponentMeta
