import { playerAccounts } from '@rotra/data/fixtures/player-accounts'
import { Chip } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccountPanel } from './AccountPanel'

const jose = playerAccounts.find((account) => account.email === 'jose@example.com')
if (!jose) throw new Error('Missing private account fixture')
const meta = {
  title: 'Player/AccountPanel',
  component: AccountPanel,
  args: {
    phone: jose.phone,
    email: jose.email,
    phoneHidden: jose.phoneHidden,
    onOpenPrivacy: () => {},
    onSignOut: () => {},
  },
} satisfies Meta<typeof AccountPanel>
export default meta
type Story = StoryObj<typeof meta>
export const PhoneHidden: Story = {}
export const PhoneVisible: Story = { args: { phoneHidden: false } }
export const WithRequestSlot: Story = {
  args: {
    requestSlot: (
      <>
        <Chip tone="warn">Waiting for approval</Chip> Email change
      </>
    ),
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
