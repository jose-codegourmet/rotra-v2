import type { ComponentMeta } from '@rotra/ui/meta'

export const nextMatchSheetMeta = {
  name: 'NextMatchSheet',
  description:
    'Q-NEXT-MATCH: after Confirm result, "Next on Court X" offers the first two ready waiting matches for the freed court as two equal cards (Left and Right): "#P" and the format chip, Team A "vs" Team B, and Pick this. Skip for now (or closing) places nothing; with none ready it shows "No ready match for Court X right now." and only Close.',
  usage: [
    'Open it right after a confirmed result, for the first court the match freed. Pass at most two candidates from nextMatchCandidates(courtId, ctx) in match.rules (the same readiness check Auto Queue uses); the sheet never works out eligibility.',
    'onPick puts the match On court (getting ready, never started) with the place-on-court mutation; recheck at pick time and pass error "That match is not ready any more. Pick again." with refreshed candidates when it fails.',
    'onSkip covers Skip for now, Close, Escape and the scrim. In Auto Queue the caller then lets Auto Queue fill that court as it would have.',
    'Swipe works only on coarse pointers with two candidates (|dx| at least 96 px or 30% of the pair width, horizontal dominating vertical by 1.5x); reduced motion keeps only the highlight. Left/Right arrow keys move focus between the two Pick this buttons.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Next-match picker after a result (issue #579)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/queueing/README.md',
  ],
  related: ['ChooseMatchSheet', 'ConfirmResultSheet', 'Sheet', 'Chip', 'Notice'],
} satisfies ComponentMeta
