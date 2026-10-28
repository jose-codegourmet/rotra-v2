import { inventoryItems } from '@rotra/data/fixtures/inventory'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InventoryItemForm } from './InventoryItemForm'
const item = inventoryItems[0]!
const meta = { title: 'Queue/InventoryItemForm', component: InventoryItemForm, args: { mode: 'add', onSubmit: fn(), onCancel: fn() } } satisfies Meta<typeof InventoryItemForm>
export default meta
type Story = StoryObj<typeof meta>
export const Add: Story = {}
export const Edit: Story = { args: { mode: 'edit', defaultValues: { name: item.name, category: item.category, unit: item.unit, stock: String(item.stock), unitCostMinor: String(item.unitCostMinor / 100) } } }
export const NameError: Story = { play: async ({ canvasElement }) => { canvasElement.querySelector('form')?.requestSubmit() } }
export const Pending: Story = { args: { ...Edit.args, isPending: true } }
export const SaveFailureKeepsValues: Story = { args: { ...Edit.args, serverError: 'Changes could not be saved' } }
