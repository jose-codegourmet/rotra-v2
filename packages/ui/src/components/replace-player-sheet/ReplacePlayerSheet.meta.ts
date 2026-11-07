import type { ComponentMeta } from '@rotra/ui/meta'

export const replacePlayerSheetMeta = {
  name: 'ReplacePlayerSheet',
  description:
    'Replace a player in match N for a match On court: "Who\'s coming out?" tiles, "Replacement" tiles for present players who are free, and the line that this is a lineup change, not a substitution.',
  usage: [
    'Open it from Replace player in OnCourtSheet. Back returns to that sheet.',
    'inMatch lists everyone in the match, Team A first, each with the team and whether they are present (a player who is not present shows "Team A · not present"). candidates are present players not in the match and not busy.',
    'Replace player needs both players. The owner rechecks; when the recheck fails keep the sheet open and pass message "Something changed. Review the match again." Set isPending while it saves.',
    'No credit question and no substitution record: the match has not started. Use SubstitutionSheet for a Playing match.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.replace (ACT.openReplace, ACT.confirmReplace)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['OnCourtSheet', 'SubstitutionSheet', 'PlayerTile'],
} satisfies ComponentMeta
