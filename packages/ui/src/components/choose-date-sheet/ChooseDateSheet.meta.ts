import type { ComponentMeta } from '@rotra/ui/meta'

export const chooseDateSheetMeta = {
  name: 'ChooseDateSheet',
  description:
    'Session setup › Choose a date: the selected-date summary (with Today), the Foundation DateCalendar grid with marked club-session days, Today, Cancel and Set date, in a Sheet.',
  usage: [
    'The Date field in SessionSetupForm is a button that opens it; Set date applies, Cancel or Escape keeps the field as it was and focus returns to the button.',
    'allowedPastDate keeps a saved past date selectable when editing.',
  ],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Q-SETUP › SHEETS.datePicker (.dp-*)',
  },
  docs: ['docs/screens/product/modules/queue/session-setup.md'],
  related: ['DateCalendar', 'DatePicker', 'SessionSetupForm', 'Sheet'],
} satisfies ComponentMeta
