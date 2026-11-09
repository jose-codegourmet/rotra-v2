import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DropOutNoticeRow } from './DropOutNoticeRow'

const meta = {
  title: 'Queue/DropOutNoticeRow',
  component: DropOutNoticeRow,
  args: { name: 'Miguel Santos', timeLabel: '7:20 PM', onRemove: fn(), onKeep: fn() },
} satisfies Meta<typeof DropOutNoticeRow>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { isPending: true } }
export const LongName: Story = {
  args: { name: 'Maria Consolacion Villanueva Bautista de la Cruz' },
}
export const ErrorState: Story = {
  name: 'Error',
  args: { error: 'Could not update the notice. Try again.' },
}
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const PendingLight: Story = { ...Pending, globals: { theme: 'light' } }
export const LongNameLight: Story = { ...LongName, globals: { theme: 'light' } }
export const ErrorLight: Story = { ...Error, globals: { theme: 'light' } }
