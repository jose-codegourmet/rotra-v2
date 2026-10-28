import { playerAccounts } from '@rotra/data/fixtures/player-accounts'
import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { personalDetailsFromProfile } from '@rotra/ui/personal-details-fields/default-values'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { EditProfileForm } from './EditProfileForm'

const jose = playerProfiles.find((p) => p.fullName === 'Jose')
const account = playerAccounts.find((a) => a.playerId === jose?.playerId)
if (!jose || !account) throw new Error('Missing Jose profile fixture')
const meta = {
  title: 'Player/EditProfileForm',
  component: EditProfileForm,
  args: {
    defaultValues: personalDetailsFromProfile(jose),
    account: { phone: account.phone, email: account.email, playerId: jose.rtrId },
    onSubmit: fn(),
    onCancel: fn(),
    onRequestContactChange: fn(),
    onOpenPhonePrivacy: fn(),
  },
  decorators: [(Story) => <div className="mx-auto max-w-[920px]">{Story()}</div>],
} satisfies Meta<typeof EditProfileForm>
export default meta
type Story = StoryObj<typeof meta>
const openSection =
  (name: string): Story['play'] =>
  async ({ canvasElement, userEvent }) => {
    await userEvent.click(await within(canvasElement).findByRole('tab', { name: new RegExp(name) }))
  }
export const NameSection: Story = {}
export const PlayingStyleSection: Story = { play: openSection('Playing style') }
export const LinksSection: Story = { play: openSection('Links') }
export const AccountSection: Story = { play: openSection('Account') }
/** Edits in Name and Links: both tabs show the unsaved dot */
export const DirtyDots: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByLabelText(/Nickname/), 's')
    await userEvent.click(canvas.getByRole('tab', { name: /Links/ }))
    await userEvent.type(await canvas.findByLabelText('YouTube'), 'https://youtube.com/@jose')
  },
}
/** Errors in Name and Links: the summary lists both and submit jumps to Name's first field */
export const ErrorsInTwoSections: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.clear(await canvas.findByLabelText(/Full name/))
    await userEvent.click(canvas.getByRole('tab', { name: /Links/ }))
    await userEvent.type(await canvas.findByLabelText('Instagram'), '/x', {
      initialSelectionStart: 0,
      initialSelectionEnd: 0,
    })
    await userEvent.type(canvas.getByLabelText('Facebook'), '.evil.example')
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }))
  },
}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = {
  args: { serverError: "Couldn't save your profile. Your edits are still here. Try again." },
}
export const Offline: Story = {
  args: {
    serverError:
      "You're offline, so nothing was saved. Your edits are still here; save again when you're connected.",
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
