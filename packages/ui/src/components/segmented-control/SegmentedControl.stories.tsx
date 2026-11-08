import { Icon } from '@rotra/ui/icon'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'

const meta = {
  title: 'Shared/SegmentedControl',
  component: SegmentedControl,
  args: {
    'aria-label': 'Show',
    value: 'all',
    onChange: () => {},
    options: [
      { value: 'all', label: 'Everyone · 14' },
      { value: 'unpaid', label: 'Not paid · 5' },
      { value: 'paid', label: 'Paid · 9' },
    ],
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <SegmentedControl {...args} value={value} onChange={setValue} />
  },
}

export const WithCounts: Story = {
  args: {
    'aria-label': 'Status',
    value: 'pending',
    options: [
      { value: 'pending', label: 'Pending', count: 3 },
      { value: 'approved', label: 'Approved', count: 128 },
      { value: 'rejected', label: 'Rejected', count: 0 },
    ],
  },
}

export const TwoOptions: Story = {
  args: {
    'aria-label': 'Payment per player',
    value: 'auto',
    options: [
      { value: 'auto', label: 'Break-even · ₱120' },
      { value: 'custom', label: 'Custom amount' },
    ],
  },
}

/** Icon-only options: icon as label, `iconOnly`, and `ariaLabel` (accessible name and hover title). */
export const IconOnly: Story = {
  args: {
    'aria-label': 'Roster view',
    value: 'list',
    options: [
      { value: 'list', label: <Icon name="list" />, iconOnly: true, ariaLabel: 'List view' },
      { value: 'grid', label: <Icon name="grid" />, iconOnly: true, ariaLabel: 'Grid view' },
    ],
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <SegmentedControl {...args} value={value} onChange={setValue} />
  },
}

export const Disabled: Story = { args: { disabled: true } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
