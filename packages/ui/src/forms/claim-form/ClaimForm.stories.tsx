import { claimLinkScenarios } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { ClaimForm } from './ClaimForm'

const meta = {
  title: 'Player/ClaimForm',
  component: ClaimForm,
  args: {
    clubName: claimLinkScenarios.clubName,
    maskedPhone: claimLinkScenarios.preview.maskedPhone,
    defaultValues: claimLinkScenarios.preset,
    onSubmit: fn(),
  },
} satisfies Meta<typeof ClaimForm>
export default meta
type Story = StoryObj<typeof meta>
export const Preset: Story = {}
export const AllErrors: Story = {
  args: { defaultValues: { ...claimLinkScenarios.preset, fullName: '' } },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement)
    await userEvent.type(await canvas.findByLabelText(/^Password/), 'one')
    await userEvent.type(canvas.getByLabelText(/Confirm password/), 'two')
    await userEvent.click(canvas.getByRole('button', { name: 'Complete registration' }))
  },
}
export const EmailConflict: Story = {
  args: {
    defaultValues: { ...claimLinkScenarios.preset, email: claimLinkScenarios.takenEmail },
    serverError: { message: claimLinkScenarios.emailConflict, field: 'email' },
  },
}
export const Pending: Story = { args: { isPending: true } }
export const OfflineServerError: Story = {
  args: { serverError: { message: claimLinkScenarios.offline } },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
