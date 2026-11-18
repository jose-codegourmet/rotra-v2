import { googleSignInExamples } from '@rotra/data/fixtures/google-sign-in'
import { claimLinkScenarios } from '@rotra/data/fixtures/player-accounts'
import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VerificationPage } from './VerificationPage'

const googleEmail = googleSignInExamples.differentEmail
const rotraEmail = googleSignInExamples.mikeePassword.email

const meta = {
  title: 'Player/VerificationPage',
  component: VerificationPage,
  args: {
    onBack: fn(),
    state: {
      kind: 'ready',
      deadline: GOOGLE_SIGN_IN_DEADLINE.label,
      verification: {
        playerId: 'story-player',
        verified: false,
        verifiedByAdmin: false,
        completedSteps: 2,
        googleEmail,
        maskedPhone: claimLinkScenarios.preview.maskedPhone,
        email: { kind: 'mismatch', rotraEmail, googleEmail, pendingEmailRequest: false },
      },
      connectingGoogle: false,
      onConnectGoogle: fn(),
      onAddPhone: fn(),
      onChangeEmail: fn(),
    },
  },
} satisfies Meta<typeof VerificationPage>

export default meta
type Story = StoryObj<typeof meta>

export const EmailMismatch: Story = {}
export const PhoneLight: Story = {
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const Loading: Story = { args: { state: { kind: 'loading' } } }
export const Failed: Story = {
  args: { state: { kind: 'error', onRetry: fn(), retrying: false } },
}
