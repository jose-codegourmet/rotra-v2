import type { Meta, StoryObj } from '@storybook/react-vite'
import { SignInMethodsCard } from './SignInMethodsCard'

const meta = {
  title: 'Player/SignInMethodsCard',
  component: SignInMethodsCard,
  args: {
    email: 'migs.santos@example.com',
    googleEmail: 'migs.santos@example.com',
    deadline: 'December 31, 2026',
    verificationLabel: 'Not verified · 2 of 3',
    onConnectGoogle: () => {},
    onChangeGoogle: () => {},
    onOpenVerification: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-[min(560px,100vw-32px)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignInMethodsCard>
export default meta
type Story = StoryObj<typeof meta>

export const WithGoogle: Story = { args: { verificationLabel: 'Verified', verified: true } }
export const WithoutGoogle: Story = {
  args: { googleEmail: null, verificationLabel: 'Not verified · 1 of 3' },
}
export const DifferentGoogleEmail: Story = {
  args: { googleEmail: 'migs.s.badminton@gmail.com', verificationLabel: 'Not verified · 2 of 3' },
}
export const NoPassword: Story = {
  args: { hasPassword: false, verificationLabel: 'Verified', verified: true },
}
export const WithoutVerificationRow: Story = {
  args: { verificationLabel: undefined, onOpenVerification: undefined },
}
export const WithGoogleLight: Story = { ...WithGoogle, globals: { theme: 'light' } }
export const WithoutGoogleLight: Story = { ...WithoutGoogle, globals: { theme: 'light' } }
export const DifferentGoogleEmailLight: Story = {
  ...DifferentGoogleEmail,
  globals: { theme: 'light' },
}
export const Phone: Story = {
  ...DifferentGoogleEmail,
  globals: { viewport: { value: 'phone' } },
}
