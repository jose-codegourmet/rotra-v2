import type { ComponentMeta } from '@rotra/ui/meta'

export const clubLogoMeta = {
  name: 'ClubLogo',
  description:
    "A club's logo picture, or its initials on a rounded square, as the Admin club directory and club detail draw it.",
  usage: [
    'Always shown next to the club name, so it is aria-hidden.',
    'sm in directory rows, lg in the club detail hero. accent is the prototype highlight Lahug Smash Club uses.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUBS › viewClubs() › logo(); .logo, .logo.lg, .logo.acc',
  },
  docs: ['docs/screens/product/modules/admin/clubs-licenses.md'],
  variants: ['sm', 'lg', 'default', 'accent', 'with-image'],
  related: ['ClubCell', 'Avatar'],
} satisfies ComponentMeta
