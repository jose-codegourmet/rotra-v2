import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { within } from 'storybook/test'
import { AdminEditPlayerForm } from './AdminEditPlayerForm'

/** The same unclaimed player with an email on file, so a change shows old → new. */
const withEmail = { ...managementPlayer, email: 'alex.reyes@example.com' }

const meta = {
  title: 'Admin/AdminEditPlayerForm',
  component: AdminEditPlayerForm,
  args: {
    player: managementPlayer,
    open: true,
    onClose: () => {},
    onSubmit: () => {},
    onReload: () => {},
  },
} satisfies Meta<typeof AdminEditPlayerForm>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }

export const Embedded: Story = { args: { embedded: true } }
export const EmbeddedLight: Story = { ...Embedded, globals: { theme: 'light' } }

/** A new email in the review step: "Sent for review · not changed yet". */
export const EmailChanged: Story = {
  args: { player: withEmail },
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    const email = await body.findByRole('textbox', { name: 'Email' })
    await userEvent.clear(email)
    await userEvent.type(email, 'alex.r@example.com')
    await userEvent.type(body.getByRole('textbox', { name: 'Reason' }), 'Player asked by phone')
    await userEvent.click(body.getByRole('button', { name: 'Review changes' }))
  },
}
export const EmailChangedLight: Story = { ...EmailChanged, globals: { theme: 'light' } }

/** An open contact-change request: Email is disabled until it is reviewed on the Contact tab. */
export const EmailLocked: Story = { args: { player: withEmail, emailLocked: true } }
export const EmailLockedLight: Story = { ...EmailLocked, globals: { theme: 'light' } }

/** The request was refused: the message shows under Email. */
export const EmailError: Story = {
  args: { player: withEmail, emailError: 'That email belongs to another ROTRA profile.' },
}
export const EmailErrorLight: Story = { ...EmailError, globals: { theme: 'light' } }
