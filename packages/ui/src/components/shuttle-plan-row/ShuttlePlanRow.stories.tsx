import { longShuttlePlanItems, shuttlePlanItems } from '@rotra/data/fixtures/financials'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { ShuttlePlanRow, type ShuttlePlanRowProps } from './ShuttlePlanRow'

function Interactive(args: ShuttlePlanRowProps) {
  const [id, setId] = useState(args.inventoryItemId)
  const [tubes, setTubes] = useState(args.tubes)
  return (
    <ShuttlePlanRow
      {...args}
      inventoryItemId={id}
      tubes={tubes}
      lineCost={(args.items.find((i) => i.id === id)?.unitCostMinor ?? 0) * (tubes || 0)}
      onItemChange={setId}
      onTubesChange={setTubes}
    />
  )
}
const meta = {
  title: 'Queue/ShuttlePlanRow',
  component: ShuttlePlanRow,
  render: (args) => <Interactive {...args} />,
  args: {
    items: shuttlePlanItems,
    inventoryItemId: 'inv1',
    tubes: 4,
    lineCost: 392000,
    onItemChange: fn(),
    onTubesChange: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof ShuttlePlanRow>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const OverStock: Story = { args: { inventoryItemId: 'inv2', tubes: 4, lineCost: 0 } }
export const LongBrand: Story = { args: { items: longShuttlePlanItems } }
