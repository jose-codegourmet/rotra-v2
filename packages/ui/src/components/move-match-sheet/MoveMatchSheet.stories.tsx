import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { MoveMatchSheet, type MoveMatchSheetProps } from './MoveMatchSheet'

const courts = [
  { id: 'court-2', label: 'Court 2' },
  { id: 'court-3', label: 'Court 3' },
  { id: 'court-4', label: 'Court 4' },
]

function Controlled(args: MoveMatchSheetProps) {
  const [value, setValue] = useState(args.value)
  return <MoveMatchSheet {...args} value={value} onChange={setValue} />
}

const meta = {
  title: 'Queue/MoveMatchSheet',
  component: MoveMatchSheet,
  render: (args) => <Controlled {...args} />,
  args: {
    open: true,
    onOpenChange: fn(),
    matchNo: 3,
    currentLabel: 'Court 1',
    courts,
    required: 1,
    value: [],
    onChange: fn(),
    onBack: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof MoveMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing chosen: Move match is disabled. */
export const NothingChosen: Story = {}

export const CourtChosen: Story = { args: { value: ['court-3'] } }

/** A 5v5 needs two free courts. */
export const FiveVsFive: Story = {
  args: { currentLabel: 'Court 1 + Court 2', required: 2, value: ['court-3'] },
}

/** No free court is left. */
export const NoCourtFree: Story = { args: { courts: [] } }

export const Pending: Story = { args: { value: ['court-3'], isPending: true } }

export const SomethingChanged: Story = {
  args: { message: 'Something changed. Review the match again.' },
}

export const SaveFailed: Story = { args: { value: ['court-3'], error: 'Changes could not be saved' } }

export const CourtChosenLight: Story = { args: { value: ['court-3'] }, globals: { theme: 'light' } }

export const Phone: Story = { args: { value: ['court-3'] }, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
