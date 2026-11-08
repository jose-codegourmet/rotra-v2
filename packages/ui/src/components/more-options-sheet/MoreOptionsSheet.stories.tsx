import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MoreOptionsSheet } from './MoreOptionsSheet'

const meta = {
  title: 'Queue/MoreOptionsSheet',
  component: MoreOptionsSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    actions: [
      { label: 'Edit preparation', onSelect: fn() },
      { label: 'Copy invite link', onSelect: fn() },
      { label: 'Delete session', onSelect: fn(), danger: true },
      { label: 'Cancel session', onSelect: fn(), danger: true },
    ],
  },
} satisfies Meta<typeof MoreOptionsSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Preparation: Story = { globals: { viewport: { value: 'phone' } } }
export const SessionSettings: Story = {
  args: {
    actions: [
      { label: 'Back to live session', onSelect: fn() },
      { label: 'Copy invite link', onSelect: fn() },
    ],
  },
  globals: { viewport: { value: 'phone' } },
}

export const RosterUnavailable: Story = {
  args: {
    actions: [
      { label: 'Edit preparation', onSelect: fn() },
      { label: 'Copy invite link', onSelect: fn() },
      { label: 'Delete session', onSelect: fn(), danger: true, disabled: true },
      { label: 'Cancel session', onSelect: fn(), danger: true, disabled: true },
    ],
  },
  globals: { viewport: { value: 'phone' } },
}
