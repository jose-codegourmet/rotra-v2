import { playerAccessScenarios, signInExamples } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SignInForm } from './SignInForm'

const meta = {
  title: 'Player/SignInForm',
  component: SignInForm,
  args: { onSubmit: () => {}, onForgotPassword: () => {} },
} satisfies Meta<typeof SignInForm>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Phone: Story = {
  args: { defaultValues: { identifier: signInExamples.international } },
}
export const RequiredErrors: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click()
  },
}
export const ServerError: Story = {
  args: {
    serverError: playerAccessScenarios.credentialError,
    defaultValues: { identifier: signInExamples.unknownEmail },
  },
}
export const SuccessNote: Story = { args: { successNote: playerAccessScenarios.successNote } }
export const Pending: Story = { args: { isPending: true } }
export const Offline: Story = { args: { offline: true } }
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
