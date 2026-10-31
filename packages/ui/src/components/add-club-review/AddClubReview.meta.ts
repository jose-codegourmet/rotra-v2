import type { ComponentMeta } from '@rotra/ui/meta'

export const addClubReviewMeta = {
  name: 'AddClubReview',
  description:
    'A-ADD-CLUB step 2: the new club\'s details, sign-in and price for a last check, what happens next, and Create club. The password shows only as "Set · N characters".',
  usage: [
    'The container passes the AddClubForm values with the password replaced by passwordLength; the password value never reaches this component.',
    "Back returns to AddClubForm with every value kept; Create club runs the container's mutation.",
    'While isPending, Create club reads "Creating…" and both buttons are disabled; serverError shows above them and nothing was created.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-ADD-CLUB › SHEETS.addClub (review step)',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/business_logic/product/admin/modules/clubs-licenses/README.md#adding-a-club',
  ],
  variants: ['paid', 'free', 'pending', 'server error'],
  related: ['AddClubForm', 'SheetSteps', 'KeyValueList', 'Sheet'],
} satisfies ComponentMeta
