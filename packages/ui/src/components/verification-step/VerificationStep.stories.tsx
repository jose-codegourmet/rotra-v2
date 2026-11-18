import { googleSignInExamples } from '@rotra/data/fixtures/google-sign-in'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { VerificationStep } from './VerificationStep'

const GOOGLE_EMAIL = googleSignInExamples.differentEmail
const ROTRA_EMAIL = googleSignInExamples.mikeePassword.email
const EMAIL_MISMATCH = `Your ROTRA email is ${ROTRA_EMAIL}, but your Google account is ${GOOGLE_EMAIL}.`

const meta = {
  title: 'Player/VerificationStep',
  component: VerificationStep,
  args: {
    number: 1,
    title: 'Connect your Google account',
    status: 'You sign in with it from now on.',
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[608px] rounded-lg border border-border bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VerificationStep>

export default meta
type Story = StoryObj<typeof meta>

export const ConnectGoogle: Story = {
  args: {
    actions: (
      <Button size="sm" variant="primary">
        Connect Google
      </Button>
    ),
  },
}
export const Done: Story = { args: { done: true, status: `Connected · ${GOOGLE_EMAIL}` } }
export const NoPhone: Story = {
  args: {
    number: 2,
    title: 'Add your mobile number',
    status: 'Clubs use it to find you. Hide it from clubs any time.',
    actions: <Button size="sm">Add phone number</Button>,
  },
}
export const ConnectGoogleFirst: Story = {
  args: {
    number: 3,
    title: 'Use your Google email as your ROTRA email',
    status: 'Connect Google first.',
  },
}
export const EmailMismatch: Story = {
  args: {
    ...ConnectGoogleFirst.args,
    status: EMAIL_MISMATCH,
    actions: (
      <>
        <Button size="sm">Change my ROTRA email to {GOOGLE_EMAIL}</Button>
        <Button size="sm" variant="ghost">
          Connect the Google account for {ROTRA_EMAIL}
        </Button>
      </>
    ),
  },
}
export const EmailMismatchPendingRequest: Story = {
  args: {
    ...ConnectGoogleFirst.args,
    status: EMAIL_MISMATCH,
    chip: <Chip tone="warn">Change sent for Admin review</Chip>,
  },
}

export const ConnectGoogleLight: Story = { ...ConnectGoogle, globals: { theme: 'light' } }
export const DoneLight: Story = { ...Done, globals: { theme: 'light' } }
export const NoPhoneLight: Story = { ...NoPhone, globals: { theme: 'light' } }
export const ConnectGoogleFirstLight: Story = { ...ConnectGoogleFirst, globals: { theme: 'light' } }
export const EmailMismatchLight: Story = { ...EmailMismatch, globals: { theme: 'light' } }
export const EmailMismatchPendingRequestLight: Story = {
  ...EmailMismatchPendingRequest,
  globals: { theme: 'light' },
}
