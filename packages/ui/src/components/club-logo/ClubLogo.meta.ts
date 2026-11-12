import type { ComponentMeta } from '@rotra/ui/meta'

export const clubLogoMeta = {
  name: 'ClubLogo',
  description:
    "A club's logo picture, or its initials on a rounded square, as the Admin club directory and club detail draw it.",
  usage: [
    'Always shown next to the club name, so it is aria-hidden.',
    'sm in directory rows, md (40 px) in the Player clubs card rows, lg in the club detail hero. accent is the prototype highlight Lahug Smash Club uses.',
    'onView (with logoUrl and viewLabel “View full logo of CLUB”) makes the logo a button that opens PhotoViewer (#716); initials never open anything, and it is left out when the logo sits in another control.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-CLUBS › viewClubs() › logo(); .logo, .logo.lg, .logo.acc',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  variants: ['sm', 'md', 'lg', 'default', 'accent', 'with-image'],
  related: ['ClubCell', 'Avatar'],
} satisfies ComponentMeta
