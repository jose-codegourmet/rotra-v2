import { deriveAccountVerification } from '@rotra/data/account-verification/rules'
import type { AdminAccountVerification } from '@rotra/data/account-verification/types'
import {
  accountVerificationFixtures,
  verificationFixturePlayerId,
} from '@rotra/data/fixtures/account-verification'
import { adminAccessExamples } from '@rotra/data/fixtures/admin-accounts'
import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerVerificationCard } from './AdminPlayerVerificationCard'

type CardVerification = Omit<AdminAccountVerification, 'revision'>

function verification(scenario: keyof typeof accountVerificationFixtures): CardVerification {
  const fixture = accountVerificationFixtures[scenario]
  const account = {
    playerId: verificationFixturePlayerId,
    email: adminPlayerDetailExamples.contact.hidden.email,
    ...fixture,
  }
  const result = {
    ...deriveAccountVerification(account, [], 'adminOverrideReason' in fixture),
    phone: account.phone || null,
  }
  if ('pendingEmailRequest' in fixture && result.email.kind === 'mismatch') {
    return { ...result, email: { ...result.email, pendingEmailRequest: true } }
  }
  return result
}

const meta = {
  title: 'Admin/AdminPlayerVerificationCard',
  component: AdminPlayerVerificationCard,
  args: { verification: verification('oneOfThree'), onOpenOverride: () => {} },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminPlayerVerificationCard>

export default meta
type Story = StoryObj<typeof meta>

export const OneOfThree: Story = {}
export const ZeroOfThree: Story = { args: { verification: verification('zeroOfThree') } }
export const MismatchedEmail: Story = { args: { verification: verification('mismatch') } }
export const MatchRequestPending: Story = {
  args: { verification: verification('mismatchPending') },
}
export const LongGoogleEmail: Story = {
  args: {
    verification: {
      ...deriveAccountVerification(
        {
          playerId: verificationFixturePlayerId,
          email: '',
          phone: accountVerificationFixtures.oneOfThree.phone,
          googleEmail: adminAccessExamples.longEmail,
        },
        [],
        false,
      ),
      phone: accountVerificationFixtures.oneOfThree.phone,
    },
  },
}
export const NoPhone: Story = { args: { verification: verification('noPhone') } }
export const Verified: Story = { args: { verification: verification('allThree') } }
export const VerifiedByAdmin: Story = { args: { verification: verification('verifiedByAdmin') } }
export const Loading: Story = { args: { verification: undefined } }
export const FailedRead: Story = { args: { verification: undefined, onRetry: () => {} } }

export const OneOfThreeLight: Story = { ...OneOfThree, globals: { theme: 'light' } }
export const ZeroOfThreeLight: Story = { ...ZeroOfThree, globals: { theme: 'light' } }
export const MismatchedEmailLight: Story = { ...MismatchedEmail, globals: { theme: 'light' } }
export const MatchRequestPendingLight: Story = {
  ...MatchRequestPending,
  globals: { theme: 'light' },
}
export const LongGoogleEmailLight: Story = { ...LongGoogleEmail, globals: { theme: 'light' } }
export const NoPhoneLight: Story = { ...NoPhone, globals: { theme: 'light' } }
export const VerifiedLight: Story = { ...Verified, globals: { theme: 'light' } }
export const VerifiedByAdminLight: Story = { ...VerifiedByAdmin, globals: { theme: 'light' } }
export const LoadingLight: Story = { ...Loading, globals: { theme: 'light' } }
export const FailedReadLight: Story = { ...FailedRead, globals: { theme: 'light' } }
