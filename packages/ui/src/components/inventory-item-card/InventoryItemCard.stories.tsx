import { inventoryItems } from '@rotra/data/fixtures/inventory'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InventoryItemCard } from './InventoryItemCard'
const meta = {
  title: 'Queue/InventoryItemCard',
  component: InventoryItemCard,
  args: { item: inventoryItems[0]!, onStep: fn(), onRemove: fn(), onEdit: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InventoryItemCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const RunningLow: Story = { args: { item: inventoryItems[2]! } }
export const ZeroStock: Story = { args: { item: { ...inventoryItems[2]!, stock: 0 } } }
export const NoCost: Story = { args: { item: inventoryItems[4]! } }
