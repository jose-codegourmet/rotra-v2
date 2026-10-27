import { licensePayments } from '@rotra/data/fixtures/licensePayments'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LicensePanel } from './LicensePanel'

const current = licensePayments[0]
if (!current) throw new Error('License fixture missing')

const meta = {
  title: 'Queue/LicensePanel',
  component: LicensePanel,
  args: {
    status: 'active',
    plan: current.plan,
    activeSince: current.startsAt,
    activeUntil: current.endsAt,
    daysLeft: 155,
    payments: licensePayments,
    onExport: fn(),
    sampleAmounts: true,
  },
} satisfies Meta<typeof LicensePanel>

export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = { globals: { viewport: { value: 'desktop' } } }
export const PhoneCards: Story = { globals: { viewport: { value: 'phone' } } }
export const Expired: Story = { args: { status: 'expired', daysLeft: 0 } }
export const NoPayments: Story = { args: { payments: [] } }
