import { adminContactReviewExamples } from '@rotra/data/fixtures/contact-change-requests'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RequestedChangeCard } from './RequestedChangeCard'

const { now, pending, fromOwner } = adminContactReviewExamples

const meta = {
  title: 'Admin/RequestedChangeCard',
  component: RequestedChangeCard,
  args: {
    from: pending.fromValue,
    to: pending.toValue,
    requestedAt: pending.requestedAt,
    source: pending.source,
    firstName: 'Jose',
    now,
  },
  decorators: [(Story) => <div className="mx-auto max-w-[640px]">{Story()}</div>],
} satisfies Meta<typeof RequestedChangeCard>

export default meta
type Story = StoryObj<typeof meta>

export const FromApp: Story = {}
/** Raymark contacted the owner, who entered the request. */
export const FromOwner: Story = {
  args: {
    from: fromOwner.fromValue,
    to: fromOwner.toValue,
    requestedAt: fromOwner.requestedAt,
    source: fromOwner.source,
    firstName: 'Raymark',
  },
}
export const NotSet: Story = { args: { from: '' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const FromOwnerLight: Story = { ...FromOwner, globals: { theme: 'light' } }
