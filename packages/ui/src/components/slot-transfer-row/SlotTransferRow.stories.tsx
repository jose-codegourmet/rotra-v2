import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SlotTransferRow } from './SlotTransferRow'

const meta = {
  title: 'Queue/SlotTransferRow',
  component: SlotTransferRow,
  args: {
    senderName: 'Jasper Lim',
    recipientName: 'Russel Tan',
    recipientRtrId: 'RTR-PH-CEB-102926-0014',
    timeLabel: '7:20 PM',
    suggestedLevel: 'intermediate_mid',
    onApprove: fn(),
    onReject: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SlotTransferRow>
export default meta
type Story = StoryObj<typeof meta>

export const NotInSession: Story = {}
export const FromWaitlist: Story = { args: { recipientWaitlistPosition: 2 } }
export const NoLevelYet: Story = { args: { suggestedLevel: null } }
export const Pending: Story = { args: { isPending: true } }
export const LongNames: Story = {
  args: {
    senderName: 'Maria Consolacion Villanueva Bautista de la Cruz',
    recipientName: 'Juan Miguel Fernando Castillo Domingo',
  },
}
export const ErrorState: Story = {
  name: 'Error',
  args: { error: 'Russel Tan already has a slot in this session.' },
}
export const NotInSessionLight: Story = { globals: { theme: 'light' } }
export const FromWaitlistLight: Story = { ...FromWaitlist, globals: { theme: 'light' } }
export const NoLevelYetLight: Story = { ...NoLevelYet, globals: { theme: 'light' } }
export const ErrorLight: Story = { ...ErrorState, globals: { theme: 'light' } }
