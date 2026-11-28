import type { ComponentMeta } from '@rotra/ui/meta'

export const queryErrorMeta = {
  name: 'QueryError',
  description:
    'Shows a failed @rotra/data query as an ErrorState: Retry for retryable and offline failures, a bounded explanation and no Retry for permission failures.',
  usage: ['Use in operator containers wherever a query can fail; pass the query object itself.'],
  docs: ['docs/screens/product/state-matrix.md'],
  related: ['ErrorState'],
} satisfies ComponentMeta
