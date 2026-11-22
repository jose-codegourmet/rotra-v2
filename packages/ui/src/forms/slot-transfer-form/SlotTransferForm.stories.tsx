import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SlotTransferForm } from './SlotTransferForm'

const meta = {
  title: 'Queue/SlotTransferForm',
  component: SlotTransferForm,
  args: {
    open: true,
    onOpenChange: fn(),
    startsLabel: 'Nov 9, 7:30 PM',
    onFind: fn(),
    onSubmit: fn(),
    onRtrIdChange: fn(),
    onCreateLink: fn(),
  },
} satisfies Meta<typeof SlotTransferForm>
export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Finding: Story = { args: { isFinding: true } }
export const NotFound: Story = {
  args: { findError: 'No registered ROTRA player has that RTR ID.' },
}
export const AlreadyConfirmed: Story = {
  args: { findError: 'Russel Tan already has a slot in this session.' },
}
export const Sending: Story = { args: { isPending: true } }
export const ServerError: Story = {
  args: { serverError: 'Your transfer request is already sent.' },
}
/** #1012: making a transfer link for a recipient with no ROTRA account */
export const CreatingLink: Story = { args: { isCreatingLink: true } }
/** #1012: the RTR ID path only (no link option) */
export const WithoutLinkOption: Story = { args: { onCreateLink: undefined } }
export const CreatingLinkLight: Story = { ...CreatingLink, globals: { theme: 'light' } }
export const EmptyLight: Story = { globals: { theme: 'light' } }
export const NotFoundLight: Story = { ...NotFound, globals: { theme: 'light' } }
export const ServerErrorLight: Story = { ...ServerError, globals: { theme: 'light' } }
