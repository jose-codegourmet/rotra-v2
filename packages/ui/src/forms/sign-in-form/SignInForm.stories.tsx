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
export const Email: Story = {
  args: { defaultValues: { email: signInExamples.email } },
}
export const PrototypeHints: Story = { args: { prototypeHints: true } }
export const RequiredErrors: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click()
  },
}
export const ServerError: Story = {
  args: {
    serverError: playerAccessScenarios.credentialError,
    defaultValues: { email: signInExamples.unknownEmail },
  },
}
export const SuccessNote: Story = { args: { successNote: playerAccessScenarios.successNote } }
export const Pending: Story = { args: { isPending: true } }
export const Offline: Story = { args: { offline: true } }
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
const legalLinks = { termsHref: '/terms', privacyHref: '/privacy' }
export const LegalLinks: Story = { args: { legalLinks } }
export const LegalLinksLight: Story = { args: { legalLinks }, globals: { theme: 'light' } }
export const LegalLinksPhone: Story = {
  args: { legalLinks },
  globals: { viewport: { value: 'phone' } },
}
const google = { onContinue: () => {}, deadlineLabel: 'December 31, 2026' }
export const WithGoogle: Story = { args: { google, prototypeHints: true, legalLinks } }
export const WithGoogleLight: Story = {
  args: { google, legalLinks },
  globals: { theme: 'light' },
}
export const WithGooglePhone: Story = {
  args: { google, legalLinks },
  globals: { viewport: { value: 'phone' } },
}
export const GooglePending: Story = { args: { google: { ...google, pending: true } } }
export const GoogleInviteContext: Story = {
  args: { google: { ...google, contextMessage: 'Sign in to join Lipa Smashers.' } },
}
export const GoogleSessionContext: Story = {
  args: {
    google: { ...google, contextMessage: 'Sign in to request a spot in Thursday Open Play.' },
  },
}
export const GoogleNotConnected: Story = {
  args: { google: { ...google, notConnectedEmail: 'ana.reyes@gmail.com' } },
}
export const GoogleNotConnectedLight: Story = {
  args: { google: { ...google, notConnectedEmail: 'ana.reyes@gmail.com' } },
  globals: { theme: 'light' },
}
export const GoogleOffline: Story = { args: { google, offline: true } }
