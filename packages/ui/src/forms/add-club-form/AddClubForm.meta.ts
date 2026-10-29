import type { ComponentMeta } from '@rotra/ui/meta'

export const addClubFormMeta = {
  name: 'AddClubForm',
  description:
    'A-ADD-CLUB step 1: the club name, founding address and city, the Queue app username and password, and the club\'s Paid or Free price. Review checks everything before the review step.',
  usage: [
    'Render it as the first step of the Add club sheet; on Review the container keeps the values and shows AddClubReview (pass passwordLength there, never the password).',
    'Pass every club name as takenNames and every account username as takenUsernames; both compare ignoring case and accents.',
    'The username follows the club name (first two words, without club/the/of/and, joined by a dot) until it is edited by hand.',
    'Generate a password fills 12 characters without look-alikes and shows it, so the platform owner can copy it for the club.',
    'The Cancel and Review buttons are part of the step; put it in a Sheet without a footer.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-ADD-CLUB › SHEETS.addClub (form step), addErrors(), slugOf(), genPass()',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md#adding-a-club',
  ],
  variants: ['empty', 'filled', 'errors', 'username taken', 'free', 'password shown', 'pending', 'server error'],
  related: ['ClubPriceFields', 'AddClubReview', 'SheetSteps', 'Sheet'],
} satisfies ComponentMeta
