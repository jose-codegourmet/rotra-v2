import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContactRequestStatus } from './ContactRequestStatus'

const STATUSES: ContactChangeStatus[] = [
  'pending',
  'approved',
  'applying',
  'applied',
  'failed',
  'rejected',
]
const request = {
  field: 'email' as const,
  fromValue: 'migs.santos@example.com',
  toValue: 'migs.new@example.com',
  status: 'pending' as ContactChangeStatus,
  requestedAt: new Date(2026, 9, 27, 18, 5).getTime(),
}
const meta = {
  title: 'Player/ContactRequestStatus',
  component: ContactRequestStatus,
  args: { request },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof ContactRequestStatus>
export default meta
type Story = StoryObj<typeof meta>
export const Pending: Story = {}
export const Applying: Story = { args: { request: { ...request, status: 'applying' } } }
export const Applied: Story = { args: { request: { ...request, status: 'applied' } } }
export const Failed: Story = { args: { request: { ...request, status: 'failed' } } }
export const Rejected: Story = { args: { request: { ...request, status: 'rejected' } } }
export const PhoneChange: Story = {
  args: {
    request: {
      ...request,
      field: 'phone',
      fromValue: '+63 917 555 0142',
      toValue: '+63 918 555 0377',
    },
  },
}
export const EveryStatusFull: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {STATUSES.map((status) => (
        <ContactRequestStatus key={status} request={{ ...request, status }} />
      ))}
    </div>
  ),
}
export const EveryStatusCompact: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {STATUSES.map((status) => (
        <ContactRequestStatus key={status} variant="compact" request={{ ...request, status }} />
      ))}
    </div>
  ),
}
