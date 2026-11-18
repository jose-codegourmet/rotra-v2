import type { ComponentMeta } from '@rotra/ui/meta'

export const confirmSheetMeta = {
  name: 'ConfirmSheet',
  description:
    'The confirmation pattern for important or permanent actions (D- dialogs): what is being confirmed, what happens, Back, and a primary button that names the action.',
  usage: [
    'Pass solidDanger for the solid Clear queue confirmation button.',
    'Copy title, consequence and button labels word for word from docs/screens/product/dialogs.md.',
    'Put the target (session, players, match, courts, scores) in summary so the operator sees the actual values.',
    'note is an optional small muted line after the consequence (D-CLUB-NAME: what does not change).',
    'extraAction is an optional second choice between Back and the primary (D-OVERFILL: Add to waitlist).',
    'notice is an optional Notice after the consequence and note (D-CONFIG: the warn notice about the undecided recalculation policy).',
    'Pass isPending from the mutation: the primary shows a spinner, Back and Escape are blocked, and a second tap cannot commit again.',
    'Pass error when the commit fails; keep the sheet open and never toast success.',
    'Same person as NAME? (D-2026-11-16-04, not yet owner-confirmed) is this sheet as is, no wrapper: the consequence names the saved player in bold, the note says the guest\'s slots, games and payments move to that record and the guest is removed, Back and "Move to NAME" (primary, not destructive); the container toasts "Moved to NAME".',
    'destructive for actions like Confirm invalid match. Focus starts on the title, so the primary is never preselected.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Mark match invalid? / Confirm match result / Start session? sheets',
  },
  docs: ['docs/screens/product/dialogs.md'],
  variants: ['default', 'destructive', 'with note', 'with notice', 'with extra action'],
  related: ['Sheet', 'Button', 'Notice'],
} satisfies ComponentMeta
