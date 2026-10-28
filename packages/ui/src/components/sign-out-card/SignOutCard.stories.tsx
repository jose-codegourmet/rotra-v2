import type { Meta, StoryObj } from '@storybook/react-vite'
import { SignOutCard } from './SignOutCard'

const meta = {
  title: 'Player/SignOutCard',
  component: SignOutCard,
  args: { onSignOut: () => {} },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof SignOutCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
