import type { ComponentMeta } from '@rotra/ui/meta'

export const sessionErrorMeta = {
  name: 'SessionError',
  description:
    'Error boundary content for the sessions routes: ErrorState with Retry, or a permission explanation.',
  usage: ['Rendered by error.tsx under app/(operator)/sessions.'],
  docs: ['docs/screens/product/state-matrix.md'],
  related: ['ErrorState', 'QueryError'],
} satisfies ComponentMeta
