import { signInExamples, playerAccessScenarios } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResetPasswordForm } from './ResetPasswordForm'
const meta = { title: 'Player/ResetPasswordForm', component: ResetPasswordForm, args: { onSubmit: () => {} } } satisfies Meta<typeof ResetPasswordForm>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Mismatch: Story = { args: { defaultValues: { password: signInExamples.password } }, play: async ({ canvasElement }) => { canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click() } }
export const Pending: Story = { args: { isPending: true } }
export const ShownPasswords: Story = { play: async ({ canvasElement }) => { canvasElement.querySelector<HTMLButtonElement>('button[aria-label="Show passwords"]')?.click() } }
export const ServerError: Story = { args: { serverError: playerAccessScenarios.resetError } }
