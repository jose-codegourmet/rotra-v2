import type { ComponentMeta } from '@rotra/ui/meta'
export const inventoryScreenMeta = {
  name: 'InventoryScreen',
  description: 'The club inventory screen and item editing flow.',
  usage: ['Use for Q-INVENTORY and Q-INVENTORY-ITEM.'],
  prototype: {
    file: 'docs/frames/queue-app/rotra-queue.html',
    screen: 'viewInventory; SHEETS.invItem',
  },
  docs: ['docs/screens/product/modules/queue/financials-inventory.md'],
} satisfies ComponentMeta
