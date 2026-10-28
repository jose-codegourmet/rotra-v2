import { inventoryItems } from '@rotra/data/fixtures/inventory'
import { InventorySection } from '@rotra/ui/inventory-section'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InventoryScreen } from './InventoryScreen'
const meta = {
  title: 'Queue/InventoryScreen',
  component: InventoryScreen,
  args: {
    count: inventoryItems.length,
    stockValue: inventoryItems.reduce((sum, i) => sum + i.stock * i.unitCostMinor, 0),
    onBack: fn(),
    onAdd: fn(),
    children: (['shuttlecocks', 'equipment', 'other'] as const).map((category) => (
      <InventorySection
        key={category}
        category={category}
        items={inventoryItems.filter((i) => i.category === category)}
        onStep={fn()}
        onRemove={fn()}
        onEdit={fn()}
      />
    )),
  },
} satisfies Meta<typeof InventoryScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const FromSetup: Story = { args: { fromSetup: true } }
