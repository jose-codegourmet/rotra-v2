import type { ComponentMeta } from '@rotra/ui/meta'

export const courtsAndTimeMeta = {
  name: 'CourtsAndTime',
  description:
    'Q-SESSION-ADJUST and Q-ADD-COURT container: CourtsAndTimeSheet on useExtendSession (toast "Session now ends HH:MM") and AddCourtForm on useAddCourt (toast "LABEL added · open until HH:MM"), both over useQueueSession for the court labels, the next "Court N" and the session start and end.',
  usage: [
    'Mounted once by SessionConsole, which keeps which sheet is open in its single `sheet` state: Extend time opens "adjust", the + Add court tile opens "add-court", and "Add a court…" inside the Courts and time sheet switches to "add-court".',
    'The add form remounts on each open so the label defaults to the current next "Court N" and the mode to "until the session ends"; a failed add shows the message inside the sheet and keeps what was typed, a successful one closes it.',
    'Courts set to "until the session ends" store openUntil null, so they follow an extension; courts with a set time keep theirs. Remove on a free court lives in SessionView (useRemoveCourt, no dialog).',
    'Renders nothing until the session has loaded.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-session-adjust--courts-and-time',
    'docs/screens/product/modules/queue/session-console.md#q-add-court--add-a-court',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
  ],
  related: ['SessionConsole', 'SessionView', 'CourtsAndTimeSheet', 'AddCourtForm', 'AddCourtTile'],
} satisfies ComponentMeta
