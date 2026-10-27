import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ChangePasswordForm } from './ChangePasswordForm'

const club = clubs[0]
if (!club) throw new Error('Club fixture missing')

const meta = {
  title: 'Queue/ChangePasswordForm',
  component: ChangePasswordForm,
  args: { username: club.username, onSubmit: fn(), onSignOut: fn() },
} satisfies Meta<typeof ChangePasswordForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = { args: { serverError: "That isn't your current password." } }
/** Type a short new password and submit to see the schema errors next to the fields. */
export const Invalid: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Current password'), 'oldpass')
    await userEvent.type(canvas.getByLabelText('New password'), 'short')
    await userEvent.type(canvas.getByLabelText('Confirm new password'), 'other')
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }))
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
