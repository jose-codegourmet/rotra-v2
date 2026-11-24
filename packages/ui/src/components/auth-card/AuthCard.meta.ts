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
    'Pass art (a public path) for the full-bleed background art, or wrap the app\'s (auth) layout in AuthArtProvider so every card gets it. Art is identical in both themes; the card keeps the theme surface. 900 px and wider the subject sits left and the card right over a dark fade with a deeper shadow; phones darken the art behind the centred card.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'Q-LOGIN (.login, .mark); rotra-player.html P-LOGIN; rotra-admin.html A-LOGIN',
  },
  docs: [
    'docs/screens/product/modules/queue/access-home.md',
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/screens/product/modules/admin/access-navigation.md',
    'docs/mockup-changes/2026-11-19-auth-backgrounds.md',
  ],
  variants: ['tagline', 'product', 'recovery-without-brand', 'below', 'google', 'context-notice', 'art'],
  related: ['Card', 'Notice', 'Field', 'GoogleButton', 'AuthArtProvider'],
} satisfies ComponentMeta
