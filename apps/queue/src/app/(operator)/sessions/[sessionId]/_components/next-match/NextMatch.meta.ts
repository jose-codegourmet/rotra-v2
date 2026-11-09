import type { ComponentMeta } from '@rotra/ui/meta'

export const nextMatchMeta = {
  name: 'NextMatch',
  description:
    'The next-match picker container (Q-NEXT-MATCH, issue #579): NextMatchSheet for the court a confirmed result freed, with up to five candidates and their player pictures and game counts from nextMatchCandidates (match.rules), Pick this on usePlaceOnCourt and Skip for now handing the court back to Auto Queue through useFillOpenedCourts (afterSkip).',
  usage: [
    'Mounted by ActiveMatch, which opens it after every successful Confirm result (Manual Queue and Auto Queue) for the first court the match used; Mark invalid does not open it.',
    'useCompleteMatch is called with holdCourtId, so Auto Queue leaves that court free while the picker is open; other freed courts fill as before.',
    'Pick this rechecks canPlace before the write and maps a conflict from the write to "That match is not ready any more. Pick again." with a refetch. Success toasts "Match N on Court X · getting ready".',
    'Skip for now, Close, Escape and the scrim place nothing. In Auto Queue the court is then filled as Auto Queue would have ("Match N on Court X · getting ready"); in Manual Queue it stays free. Offline, Auto Queue pauses as everywhere else.',
  ],
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['NextMatchSheet', 'ActiveMatch', 'StartMatch', 'SessionConsole'],
} satisfies ComponentMeta
