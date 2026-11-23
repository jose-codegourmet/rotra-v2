import type { ComponentMeta } from '@rotra/ui/meta'

export const moveMatchSheetMeta = {
  name: 'MoveMatchSheet',
  description:
    "Move match N for a match On court or Playing: where it is now and the free open courts to move it to (two for a 5v5). A Getting ready match stays getting ready; a Playing one keeps playing and its time doesn't restart.",
  usage: [
    'Open it from Move to another court in OnCourtSheet. Back returns to that sheet.',
    'Pass variant "playing" for a Playing match (open it from Move to a free court): the line reads "Now on Court 3. It keeps playing on the new court; its time doesn\'t restart." The default is Getting ready.',
    'value may arrive already picked, e.g. a two-court match dragged onto a free court; the owner passes that court.',
    'courts are the free open courts only; required is 1, or 2 for a 5v5. With none free it reads "No other court is free."',
    'Move match needs the right number of courts. The owner rechecks; when the recheck fails keep the sheet open and pass message "Something changed. Review the match again." Set isPending while it saves.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.moveCourt (ACT.openMoveCourt, ACT.confirmMove)',
  },
  docs: [
    'docs/screens/product/modules/queue/match-control.md',
    'docs/business_logic/product/queue/modules/matches/README.md',
  ],
  related: ['OnCourtSheet', 'CourtPicker', 'StartMatchSheet'],
} satisfies ComponentMeta
