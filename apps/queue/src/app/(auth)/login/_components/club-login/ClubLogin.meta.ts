import type { ComponentMeta } from '@rotra/ui/meta'

export const clubLoginMeta = {
  name: 'ClubLogin',
  description:
    'Q-LOGIN container: the top bar with the theme switch, and ClubLoginForm wired to the mock club sign-in. Signed-in clubs are sent to the dashboard.',
  usage: [
    'Rendered by /login. Offline comes from the dev toggle; a failed sign-in keeps what was typed.',
  ],
  docs: ['docs/screens/product/modules/queue/access-home.md'],
  related: ['ClubLoginForm', 'AuthCard', 'TopBar'],
} satisfies ComponentMeta
