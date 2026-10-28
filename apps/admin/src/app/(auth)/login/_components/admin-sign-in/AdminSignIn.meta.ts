import type { ComponentMeta } from '@rotra/ui/meta'
export const adminSignInMeta = {
  name: 'AdminSignIn',
  description: 'Connects A-LOGIN to the mock Admin session and sign-in/sign-out hooks.',
  usage: ['The login route only; renders a bounded denial for a non-owner account.'],
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  related: ['AdminSignInForm', 'AccessDeniedCard'],
} satisfies ComponentMeta
