import { inventoryItems } from '@rotra/data/fixtures/inventory'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InventorySection } from './InventorySection'
const meta = {
  title: 'Queue/InventorySection',
  component: InventorySection,
  args: {
    category: 'shuttlecocks',
    items: inventoryItems.filter((i) => i.category === 'shuttlecocks'),
    onStep: fn(),
    onRemove: fn(),
    onEdit: fn(),
  },
} satisfies Meta<typeof InventorySection>
export default meta
type Story = StoryObj<typeof meta>
export const Shuttlecocks: Story = {}
export const EmptyEquipment: Story = { args: { category: 'equipment', items: [] } }
