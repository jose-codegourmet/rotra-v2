import type { Meta, StoryObj } from '@storybook/react-vite'
import { PhonePrivacyCard } from './PhonePrivacyCard'

const meta = {
  title: 'Player/PhonePrivacyCard',
  component: PhonePrivacyCard,
  args: { savedHidden: true, onToggle: () => {} },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof PhonePrivacyCard>
export default meta
type Story = StoryObj<typeof meta>
export const Hidden: Story = {}
export const Visible: Story = { args: { savedHidden: false } }
export const Saving: Story = { args: { isPending: true } }
export const OfflineError: Story = {
  args: {
    error: "Couldn't save because you're offline. Your phone is still hidden from clubs.",
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
