import type { ComponentMeta } from '@rotra/ui/meta'

export const courtsAndTimeMeta = {
  name: 'CourtsAndTime',
  description:
    'Q-SESSION-ADJUST and Q-ADD-COURT container: CourtsAndTimeSheet (court rows with status chip, booking line and Change time) on useExtendSession (toast "Session ends at HH:MM · public page updates after sync") and AddCourtForm on useAddCourt/useUpdateCourt (toast "LABEL added · open until HH:MM"), both over useQueueSession and useSessionMatches for the court windows and used/occupied guards, the next "Court N" and the session start and end.',
  usage: [
    'Mounted once by SessionConsole, which keeps which sheet is open in its single `sheet` state: Courts and time opens "adjust", the + Add court tile opens "add-court", and "Add a court…" inside the Courts and time sheet switches to "add-court".',
    'The add form remounts on each open so the label defaults to the current next "Court N" and the mode to "until the session ends"; a refused add shows the message inside the sheet and keeps what was typed, a save failure ("Changes could not be saved", or offline without a downloaded copy) is an error toast that claims nothing, and a successful add closes the sheet.',
    'Courts set to "until the session ends" store openUntil null, so they follow an extension; courts with a set time keep theirs. Remove lives in SessionView\'s court ⋯ menu (useRemoveCourt, with the occupied and last-court guards), not in this sheet.',
    'Each court row gets its status from useSessionMatches (Playing = a started match, Getting ready = a match placed but not started, else Free) and Opened early from openedEarly. Change time opens the court sheet even while a match is on the court: a used start (a match on it, or opened early) stays fixed; the end and label stay editable and the match is not touched.',
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
