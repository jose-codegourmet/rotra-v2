import { googleSignInExamples } from '@rotra/data/fixtures/google-sign-in'
import { claimLinkScenarios } from '@rotra/data/fixtures/player-accounts'
import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { VerificationStep } from '@rotra/ui/verification-step'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { VerificationCard } from './VerificationCard'

const GOOGLE_EMAIL = googleSignInExamples.differentEmail
const ROTRA_EMAIL = googleSignInExamples.mikeePassword.email
const MATCHING_EMAIL = googleSignInExamples.googleOnly

const GOOGLE_TITLE = 'Connect your Google account'
const PHONE_TITLE = 'Add your mobile number'
const EMAIL_TITLE = 'Use your Google email as your ROTRA email'

const connectGoogle = (
  <VerificationStep
    number={1}
    title={GOOGLE_TITLE}
    status="You sign in with it from now on."
    actions={
      <Button size="sm" variant="primary">
        Connect Google
      </Button>
    }
  />
)
const mismatchedGoogle = (
  <VerificationStep number={1} title={GOOGLE_TITLE} status={`Connected · ${GOOGLE_EMAIL}`} done />
)
const matchingGoogle = (
  <VerificationStep number={1} title={GOOGLE_TITLE} status={`Connected · ${MATCHING_EMAIL}`} done />
)
const addPhone = (
  <VerificationStep
    number={2}
    title={PHONE_TITLE}
    status="Clubs use it to find you. Hide it from clubs any time."
    actions={<Button size="sm">Add phone number</Button>}
  />
)
const phoneOnFile = (
  <VerificationStep
    number={2}
    title={PHONE_TITLE}
    status={`On your account · ${claimLinkScenarios.preview.maskedPhone}`}
    done
  />
)
const googleNeeded = (
  <VerificationStep number={3} title={EMAIL_TITLE} status="Connect Google first." />
)
const emailMatches = (
  <VerificationStep number={3} title={EMAIL_TITLE} status={`Both are ${MATCHING_EMAIL}`} done />
)

const EMAIL_MISMATCH = `Your ROTRA email is ${ROTRA_EMAIL}, but your Google account is ${GOOGLE_EMAIL}.`
const changeEmail = (
  <VerificationStep
    number={3}
    title={EMAIL_TITLE}
    status={EMAIL_MISMATCH}
    actions={
      <>
        <Button size="sm">Change my ROTRA email to {GOOGLE_EMAIL}</Button>
        <Button size="sm" variant="ghost">
          Connect the Google account for {ROTRA_EMAIL}
        </Button>
      </>
    }
  />
)
const pendingChange = (
  <VerificationStep
    number={3}
    title={EMAIL_TITLE}
    status={EMAIL_MISMATCH}
    chip={<Chip tone="warn">Change sent for Admin review</Chip>}
  />
)

const meta = {
  title: 'Player/VerificationCard',
  component: VerificationCard,
  args: { completedSteps: 0, deadline: GOOGLE_SIGN_IN_DEADLINE.label },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[608px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VerificationCard>

export default meta
type Story = StoryObj<typeof meta>

export const ZeroOfThree: Story = {
  args: {
    children: (
      <>
        {connectGoogle}
        {addPhone}
        {googleNeeded}
      </>
    ),
  },
}
export const OneOfThree: Story = {
  args: {
    completedSteps: 1,
    children: (
      <>
        {connectGoogle}
        {phoneOnFile}
        {googleNeeded}
      </>
    ),
  },
}
export const TwoOfThreeEmailMismatch: Story = {
  args: {
    completedSteps: 2,
    children: (
      <>
        {mismatchedGoogle}
        {phoneOnFile}
        {changeEmail}
      </>
    ),
  },
}
export const EmailMismatchPendingRequest: Story = {
  args: {
    completedSteps: 2,
    children: (
      <>
        {mismatchedGoogle}
        {phoneOnFile}
        {pendingChange}
      </>
    ),
  },
}
export const NoPhone: Story = {
  args: {
    completedSteps: 2,
    children: (
      <>
        {matchingGoogle}
        {addPhone}
        {emailMatches}
      </>
    ),
  },
}
export const ThreeOfThree: Story = {
  args: {
    completedSteps: 3,
    children: (
      <>
        {matchingGoogle}
        {phoneOnFile}
        {emailMatches}
      </>
    ),
  },
}
export const VerifiedByAdmin: Story = {
  args: { ...ZeroOfThree.args, verifiedByAdmin: true },
}

export const ZeroOfThreeLight: Story = { ...ZeroOfThree, globals: { theme: 'light' } }
export const OneOfThreeLight: Story = { ...OneOfThree, globals: { theme: 'light' } }
export const TwoOfThreeEmailMismatchLight: Story = {
  ...TwoOfThreeEmailMismatch,
  globals: { theme: 'light' },
}
export const EmailMismatchPendingRequestLight: Story = {
  ...EmailMismatchPendingRequest,
  globals: { theme: 'light' },
}
export const NoPhoneLight: Story = { ...NoPhone, globals: { theme: 'light' } }
export const ThreeOfThreeLight: Story = { ...ThreeOfThree, globals: { theme: 'light' } }
export const VerifiedByAdminLight: Story = { ...VerifiedByAdmin, globals: { theme: 'light' } }
