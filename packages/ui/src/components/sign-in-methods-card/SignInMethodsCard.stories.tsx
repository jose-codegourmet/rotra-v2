import type { Meta, StoryObj } from '@storybook/react-vite'
import { SignInMethodsCard } from './SignInMethodsCard'

const meta = {
  title: 'Player/SignInMethodsCard',
  component: SignInMethodsCard,
  args: {
    email: 'migs.santos@example.com',
    googleEmail: 'migs.santos@example.com',
    deadline: 'December 31, 2026',
    verification: { completedSteps: 2 },
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

export const WithGoogle: Story = { args: { verification: { completedSteps: 3 } } }
export const WithoutGoogle: Story = {
  args: { googleEmail: null, verification: { completedSteps: 1 } },
}
export const DifferentGoogleEmail: Story = {
  args: { googleEmail: 'migs.s.badminton@gmail.com', verification: { completedSteps: 2 } },
}
export const NoPassword: Story = {
  args: { hasPassword: false, verification: { completedSteps: 3 } },
}
export const VerifiedByAdmin: Story = {
  args: { googleEmail: null, verification: { completedSteps: 1, verifiedByAdmin: true } },
}
export const WithoutVerificationRow: Story = {
  args: { verification: undefined, onOpenVerification: undefined },
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
