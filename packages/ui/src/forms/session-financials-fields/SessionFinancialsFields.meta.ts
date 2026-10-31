import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionFinancialsFieldsMeta = {
  name: 'SessionFinancialsFields',
  description: 'The optional Financials section of session setup page 3.',
  usage: ['Compose inside the setup FormProvider; inject the cost rule from the container.'],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'Setup page 3 › financePanel',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: [
    'empty',
    'prefilled-from-venue',
    'custom-profit',
    'custom-loss',
    'over-stock',
    'no-shuttlecocks',
    'validation-errors',
  ],
} satisfies ComponentMeta
