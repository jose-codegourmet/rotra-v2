import type { ContactChangeStatus } from '@rotra/data/contact-change-request/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContactRequestStatusChip } from './ContactRequestStatusChip'

const STATUSES: ContactChangeStatus[] = [
  'pending',
  'approved',
  'applying',
  'applied',
  'failed',
  'rejected',
]

const meta = {
  title: 'Admin/ContactRequestStatusChip',
  component: ContactRequestStatusChip,
  args: { status: 'pending' },
} satisfies Meta<typeof ContactRequestStatusChip>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {}
/** 'approved' has no chip of its own: it reads the same as applying. */
export const Approved: Story = { args: { status: 'approved' } }
export const Applying: Story = { args: { status: 'applying' } }
export const Applied: Story = { args: { status: 'applied' } }
export const Failed: Story = { args: { status: 'failed' } }
export const Rejected: Story = { args: { status: 'rejected' } }
export const Conflict: Story = { args: { conflict: true } }
export const EveryStatus: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      {STATUSES.map((status) => (
        <ContactRequestStatusChip key={status} status={status} />
      ))}
      <ContactRequestStatusChip status="pending" conflict />
    </div>
  ),
}
export const Phone: Story = { ...EveryStatus, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...EveryStatus, globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { ...EveryStatus, globals: { theme: 'light' } }
