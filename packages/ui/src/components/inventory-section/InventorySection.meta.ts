import type { ComponentMeta } from '@rotra/ui/meta'
export const inventorySectionMeta = {
  name: 'InventorySection',
  description: 'Club inventory inventory section with manual stock control.',
  usage: ['Use for operator inventory; Session done deducts the planned tubes (D-2026-11-26-01).'],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'viewInventory; SHEETS.invItem',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
  variants: ['items', 'empty'],
} satisfies ComponentMeta
