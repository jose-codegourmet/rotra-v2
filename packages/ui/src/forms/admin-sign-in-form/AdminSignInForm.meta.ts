import type { ComponentMeta } from '@rotra/ui/meta'

export const adminSignInFormMeta = {
  name: 'AdminSignInForm',
  description:
    'Platform-owner sign-in. Email and password are a proposed carry-forward; final Admin auth policy remains open.',
  usage: ['Use on A-LOGIN; the container owns the mock mutation and navigation.'],
  prototype: { file: 'docs/frames/admin-app/rotra-admin.html', screen: 'Sign in (viewLogin)' },
  docs: ['docs/screens/product/modules/admin/access-navigation.md'],
  variants: ['default', 'pending', 'server-error', 'session-ended', 'field-errors'],
  related: ['AccessDeniedCard', 'AuthCard', 'TextInput'],
} satisfies ComponentMeta
