import { playerAccessScenarios } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ForgotPasswordForm } from './ForgotPasswordForm'

const meta = {
  title: 'Player/ForgotPasswordForm',
  component: ForgotPasswordForm,
  args: { onSubmit: () => {}, onBack: () => {} },
} satisfies Meta<typeof ForgotPasswordForm>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const InvalidEmail: Story = {
  args: { defaultValues: { email: playerAccessScenarios.invalidEmail } },
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click()
  },
}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = { args: { serverError: playerAccessScenarios.requestError } }
export const Offline: Story = { args: { offline: true } }
