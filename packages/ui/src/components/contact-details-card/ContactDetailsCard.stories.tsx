import { playerAccounts } from '@rotra/data/fixtures/player-accounts'
import { ContactRequestStatus } from '@rotra/ui/contact-request-status'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContactDetailsCard } from './ContactDetailsCard'

const migs = playerAccounts.find((account) => account.email === 'migs.santos@example.com')
if (!migs) throw new Error('Missing private account fixture')
const meta = {
  title: 'Player/ContactDetailsCard',
  component: ContactDetailsCard,
  args: { phone: migs.phone, email: migs.email, onRequestChange: () => {} },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof ContactDetailsCard>
export default meta
type Story = StoryObj<typeof meta>
export const NoRequest: Story = {}
export const OpenRequest: Story = {
  args: {
    hasOpenRequest: true,
    statusSlot: (
      <ContactRequestStatus
        request={{
          field: 'email',
          fromValue: migs.email,
          toValue: 'migs.new@example.com',
          status: 'pending',
          requestedAt: new Date(2026, 9, 27, 18, 5).getTime(),
        }}
      />
    ),
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
