import type { AdminContactChangeRequest } from '@rotra/data/contact-change-request/types'
import { adminContactReviewExamples } from '@rotra/data/fixtures/contact-change-requests'
import { players } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContactRequestStatusNotice } from './ContactRequestStatusNotice'

const { now, pending, applying, applied, failed, rejected } = adminContactReviewExamples

// The prototype's firstName(): nickname, else the first word of the name.
function firstNameOf(playerId: string) {
  const player = players.find((entry) => entry.id === playerId)
  return player?.nickname || player?.fullName.split(' ')[0] || ''
}

function argsOf(request: AdminContactChangeRequest) {
  return {
    status: request.status,
    firstName: firstNameOf(request.playerId),
    from: request.fromValue,
    to: request.toValue,
    approvedAt: request.approvedAt,
    appliedAt: request.appliedAt,
    decidedAt: request.decidedAt,
    error: request.error,
    now,
  }
}

const meta = {
  title: 'Admin/ContactRequestStatusNotice',
  component: ContactRequestStatusNotice,
  args: argsOf(applying),
  decorators: [(Story) => <div className="mx-auto max-w-[720px]">{Story()}</div>],
} satisfies Meta<typeof ContactRequestStatusNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Applying: Story = {}
export const Applied: Story = { args: argsOf(applied) }
/** Approved, but the sign-in provider refused it: never labelled Applied. */
export const Failed: Story = { args: argsOf(failed) }
/** No provider message: the prototype's fallback sentence. */
export const FailedWithoutError: Story = { args: { ...argsOf(failed), error: undefined } }
export const Rejected: Story = { args: argsOf(rejected) }
/** Waiting for review renders nothing. */
export const Pending: Story = { args: argsOf(pending) }
export const Every: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {[applying, applied, failed, rejected].map((request) => (
        <ContactRequestStatusNotice key={request.requestId} {...argsOf(request)} />
      ))}
    </div>
  ),
}
export const Phone: Story = { ...Every, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...Every, globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { ...Every, globals: { theme: 'light' } }
