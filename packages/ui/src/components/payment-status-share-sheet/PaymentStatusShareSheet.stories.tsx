import { buildPaymentShare } from '@rotra/data/session-payment/share-rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PaymentStatusShareSheet } from './PaymentStatusShareSheet'

const rows = [
  { name: 'Maya Cruz', receivedMinor: 70000 },
  { name: 'Ben Lim', receivedMinor: 50000 },
  { name: 'Carl Tan', receivedMinor: null },
  { name: 'Dina Ong', receivedMinor: 80000 },
  { name: 'Eli Reyes (guest)', receivedMinor: 30000 },
]

function Interactive({ withShare }: { withShare: boolean }) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all')
  const share = buildPaymentShare({
    heading: 'Thursday Open Play · Thu, Nov 20',
    amountDue: 70000,
    rows,
    filter,
  })
  return (
    <PaymentStatusShareSheet
      open
      onOpenChange={fn()}
      filter={filter}
      onFilterChange={setFilter}
      counts={share.counts}
      text={share.text}
      onCopy={fn()}
      onShare={withShare ? fn() : undefined}
    />
  )
}

const meta = {
  title: 'Queue/PaymentStatusShareSheet',
  component: PaymentStatusShareSheet,
  render: () => <Interactive withShare />,
} satisfies Meta<typeof PaymentStatusShareSheet>
export default meta
type Story = StoryObj<typeof PaymentStatusShareSheet>

export const AllDark: Story = { globals: { theme: 'dark' } }
export const AllLight: Story = { globals: { theme: 'light' } }
export const CopyOnly: Story = {
  render: () => <Interactive withShare={false} />,
  globals: { theme: 'dark' },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
