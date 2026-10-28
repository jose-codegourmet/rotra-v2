import type { ComponentMeta } from '@rotra/ui/meta'

export const shuttlePlanRowMeta = {
  name: 'ShuttlePlanRow',
  description: "One controlled shuttlecock plan line with a stock warning.",
  usage: ['Use on operator financial surfaces; amounts are integer centavos.'],
  prototype: { file: 'docs/frames/queue-app/rotra-queue.html', screen: 'Setup page 3 › Financials; Session record › Financials' },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ["default", "over-stock", "long-brand"],
} satisfies ComponentMeta
