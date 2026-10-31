import type { ComponentMeta } from '@rotra/ui/meta'

export const chooseMatchSheetMeta = {
  name: 'ChooseMatchSheet',
  description:
    'Q-CHOOSE-MATCH: "Start a match on Court X" with one row per waiting match ("#P", the two teams, "FORMAT · Ready to start" or the block reason) and Start here, enabled only when the match is ready.',
  usage: [
    'Open it from Pick another on a free CourtCard, which shows only when more than one match waits.',
    'Pass every waiting match in queue order with its status from matchStatus(match, ctx); the sheet never works out eligibility. Start here opens StartMatchSheet for that match with this court preselected.',
    'Queue order is a suggestion, not a rule: any ready match can go next. A match stays locked only while a player is still on court or is not present.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'SHEETS.chooseMatch (ACT.openChooseMatch, .opt rows with data-act="openDispatch")',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['StartMatchSheet', 'CourtPicker', 'CourtCard', 'MatchCard', 'Sheet'],
} satisfies ComponentMeta
