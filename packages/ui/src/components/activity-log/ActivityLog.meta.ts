import type { ComponentMeta } from '@rotra/ui/meta'

export const activityLogMeta = {
  name: 'ActivityLog',
  description:
    'A list of Admin actions, newest first: what was done, then when and by whom in small muted text. Shows emptyText when there is nothing yet.',
  usage: [
    'Use for Record of actions on club and player detail, Recently decided on name changes, and Versions on ranking settings.',
    'lead adds bold words before the text, as Versions does ("Version 1").',
    'Times show as "Oct 3, 10:00 AM" in Philippine time.',
    'Never put passwords, tokens or unneeded contact values in the text.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen:
      'A-CLUB-DETAIL › Record of actions .log; A-PLAYER-DETAIL › Record of actions .log; A-RANK-CONFIG › Versions .log',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/screens/product/modules/admin/configuration.md',
    'docs/database_design/product/admin/modules/configuration-requests.md',
  ],
  variants: ['default', 'with-lead', 'empty'],
  related: ['Card'],
} satisfies ComponentMeta
