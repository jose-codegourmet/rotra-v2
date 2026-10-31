import type { ComponentMeta } from '@rotra/ui/meta'

export const activeSessionCardMeta = {
  name: 'ActiveSessionCard',
  description:
    'The club\'s active session on the club detail Overview tab: the running session with its venue and start time, an expiry exception, or "No session running."',
  usage: [
    'Pass session while one runs; it wins over exceptionNote.',
    'Pass exceptionNote when a session ran past the license end and was allowed to finish and sync.',
    'The venue is the session venue, kept apart from the founding address in ClubIdentityCard.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › Overview › Active session',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md',
  ],
  variants: ['live', 'exception', 'none'],
  related: ['Card', 'ClubIdentityCard', 'DetailHero'],
} satisfies ComponentMeta
