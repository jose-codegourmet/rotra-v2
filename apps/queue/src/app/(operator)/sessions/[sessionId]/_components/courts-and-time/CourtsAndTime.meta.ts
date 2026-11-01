import type { ComponentMeta } from '@rotra/ui/meta'

export const courtsAndTimeMeta = {
  name: 'CourtsAndTime',
  description:
    'Q-SESSION-ADJUST and Q-ADD-COURT container: CourtsAndTimeSheet on useExtendSession (toast "Session now ends HH:MM") and AddCourtForm on useAddCourt/useUpdateCourt (toast "LABEL added · open until HH:MM"), both over useQueueSession and useSessionMatches for the court windows and used/occupied guards, the next "Court N" and the session start and end.',
  usage: [
    'Mounted once by SessionConsole, which keeps which sheet is open in its single `sheet` state: Extend time opens "adjust", the + Add court tile opens "add-court", and "Add a court…" inside the Courts and time sheet switches to "add-court".',
    'The add form remounts on each open so the label defaults to the current next "Court N" and the mode to "until the session ends"; a refused add shows the message inside the sheet and keeps what was typed, a save failure ("Changes could not be saved", or offline without a downloaded copy) is an error toast that claims nothing, and a successful add closes the sheet.',
    'Courts set to "until the session ends" store openUntil null, so they follow an extension; courts with a set time keep theirs. Remove is available here and in SessionView through useRemoveCourt, with the occupied and last-court guards.',
    'Used starts stay fixed; save failures keep field values and show an inline error.',
    'Renders nothing until the session has loaded.',
  ],
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-session-adjust--courts-and-time',
    'docs/screens/product/modules/queue/session-console.md#q-add-court--add-a-court',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
  ],
  related: ['SessionConsole', 'SessionView', 'CourtsAndTimeSheet', 'AddCourtForm', 'AddCourtTile'],
} satisfies ComponentMeta
