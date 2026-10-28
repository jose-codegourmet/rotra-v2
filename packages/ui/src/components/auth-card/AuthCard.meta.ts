import type { ComponentMeta } from '@rotra/ui/meta'

export const authCardMeta = {
  name: 'AuthCard',
  description:
    "The centered sign-in layout shared by Queue, Player Information and Admin: the ROTRA mark, a title and the app's own sign-in form.",
  usage: [
    'Queue: title "Club login", tagline "Run the game.". Player: title "Sign in", tagline "Your player profile.". Admin: title "Sign in", product "Admin".',
    "Put the product's sign-in form in children; errors from a failed sign-in go in a Notice inside the form.",
    'Pass offline to show "Signing in needs an internet connection." and disable submit in the form.',
    'No Facebook or social sign-in buttons, ever.',
  ],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'Q-LOGIN (.login, .mark); rotra-player.html P-LOGIN; rotra-admin.html A-LOGIN',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/screens/product/modules/admin/access-navigation.md',
  ],
  variants: ['tagline', 'product', 'recovery-without-brand'],
  related: ['Card', 'Notice', 'Field'],
} satisfies ComponentMeta
