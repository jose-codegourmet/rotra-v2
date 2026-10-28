import type { ComponentMeta } from '@rotra/ui/meta'

export const deleteSessionSheetMeta = {
  name: 'DeleteSessionSheet',
  description:
    'D-DELETE-SESSION on ConfirmSheet: Session, When, Venue and Roster, then one of two variants. Nobody confirmed: destructive Delete session beside Keep session. Players confirmed: "Can\'t delete this session" with Open roster, and no delete.',
  usage: [
    'Open from the Delete session button on Q-PREPARE; the container runs useDeleteSession, which refuses a session that has started or has confirmed players (the error shows in the sheet).',
    'Waitlist entries and pending join requests do not block the delete; they are removed with the session.',
    'Offline, Delete session is disabled with an offline notice: deleting is online-only.',
  ],
  docs: ['docs/screens/product/dialogs.md', 'docs/screens/product/modules/queue/session-setup.md'],
  variants: ['deletable', 'blocked'],
  related: ['ConfirmSheet', 'StartSessionSheet'],
} satisfies ComponentMeta
