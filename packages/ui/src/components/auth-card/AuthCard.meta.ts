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
    "Use below for a small centred line under the card, outside it: Player's Terms of Service and Privacy Policy note.",
    'Player P-LOGIN (Google sign-in): pass google (a GoogleButton) to show it above the form with the divider "Signed up with a password?" (googleDivider overrides the text), and contextNotice for "Sign in to join <club>." or the "This Google account isn\'t connected to ROTRA." notice. All three are opt-in; without them the card is unchanged.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-LOGIN (.login, .mark); rotra-player.html P-LOGIN; rotra-admin.html A-LOGIN',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/screens/product/modules/admin/access-navigation.md',
  ],
  variants: ['tagline', 'product', 'recovery-without-brand', 'below', 'google', 'context-notice'],
  related: ['Card', 'Notice', 'Field', 'GoogleButton'],
} satisfies ComponentMeta
