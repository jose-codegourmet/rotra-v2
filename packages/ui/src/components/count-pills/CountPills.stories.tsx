import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { CountPills } from './CountPills'

const meta = {
  title: 'Shared/CountPills',
  component: CountPills,
  args: {
    'aria-label': 'Court',
    value: 'all',
    onChange: () => {},
    items: [
      { value: 'all', label: 'All courts', count: 15 },
      { value: 'c1', label: 'Court 1', count: 5 },
      { value: 'c2', label: 'Court 2', count: 6 },
      { value: 'c3', label: 'Court 3', count: 4 },
    ],
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <CountPills {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof CountPills>

export default meta
type Story = StoryObj<typeof meta>

export const AllPicked: Story = {}

export const OnePicked: Story = { args: { value: 'c2' } }

export const ZeroCount: Story = {
  args: {
    value: 'c3',
    items: [
      { value: 'all', label: 'All courts', count: 11 },
      { value: 'c1', label: 'Court 1', count: 5 },
      { value: 'c2', label: 'Court 2', count: 6 },
      { value: 'c3', label: 'Court 3', count: 0 },
    ],
  },
}

export const Wrapped: Story = {
  args: {
    items: [
      { value: 'all', label: 'All courts', count: 27 },
      { value: 'c1', label: 'Court 1', count: 5 },
      { value: 'c2', label: 'Court 2', count: 6 },
      { value: 'c3', label: 'Court 3', count: 4 },
      { value: 'c4', label: 'Court 4', count: 7 },
      { value: 'c5', label: 'Court 5', count: 5 },
    ],
  },
  globals: { viewport: { value: 'phone' } },
}
