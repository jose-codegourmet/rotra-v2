import type { ComponentMeta } from '@rotra/ui/meta'
export const inventorySectionMeta = {
  name: 'InventorySection',
  description: 'Club inventory inventory section with manual stock control.',
  usage: ['Use for operator inventory; stock is never deducted automatically.'],
  prototype: {
    file: 'app/mocksups-app/queue-app/rotra-queue.html',
    screen: 'viewInventory; SHEETS.invItem',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['items', 'empty'],
} satisfies ComponentMeta
