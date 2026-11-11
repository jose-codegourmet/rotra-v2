import type { ComponentMeta } from '@rotra/ui/meta'

export const startSessionSheetMeta = {
  name: 'StartSessionSheet',
  description:
    'D-START-SESSION on ConfirmSheet: Session, Courts, Formats, Mode, Minimum and Roster, the level-lock notice, the offline notice (Starting needs an internet connection.) with Start session disabled, Back and Start session. A late or other-day start (T3) first shows "This session was planned for … Set a new end time to start." and a required New end date-and-time picker.',
  usage: [
    'Open from StartSessionBar or the phone dock; the container runs useStartSession and re-checks the blocker at confirm (error shows in the sheet).',
    'Pass plannedStartAt and plannedEndAt so the sheet can tell a late or other-day start (after the planned end, or on another day than planned). Then New end is pre-filled with now plus the planned length rounded up to 15 minutes, offers times after now up to 24 h later, and Start session stays disabled until it is after now.',
    'onConfirm(newEndAt) receives the chosen New end only when one was required; an on-time start calls onConfirm() with nothing. The toast ("Session started · levels locked · ends at 9:30 PM") is the container\'s.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-PREPARE › SHEETS.start',
  },
  docs: [
    'docs/screens/product/dialogs.md',
    'docs/screens/product/modules/queue/session-setup.md#q-start--start-review',
    'docs/business_logic/product/queue/modules/sessions/README.md#times-and-days',
  ],
  related: ['ConfirmSheet', 'StartSessionBar', 'DateTimePicker'],
} satisfies ComponentMeta
