import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmailConfirmBanner } from './EmailConfirmBanner'

const meta = {
  title: 'Player/EmailConfirmBanner',
  component: EmailConfirmBanner,
  args: { email: 'migs.santos@example.com', onResend: () => {} },
} satisfies Meta<typeof EmailConfirmBanner>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: {} }
export const Pending: Story = { args: { pending: true } }
export const Resent: Story = { args: { resent: true } }
export const Prototype: Story = { args: { onConfirm: () => {} } }
export const LongEmail: Story = {
  args: { email: 'a.very.long.email.address.for.the.confirmation.banner@example.com' },
}
export const Failure: Story = { args: { error: "Couldn't resend the email. Try again." } }
