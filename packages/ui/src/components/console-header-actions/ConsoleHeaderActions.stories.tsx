import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import { PageHeader } from '@rotra/ui/page-header'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ConsoleHeaderActions } from './ConsoleHeaderActions'

const { session, matchRequests } = consoleSessionFixture

const meta = {
  title: 'Queue/ConsoleHeaderActions',
  component: ConsoleHeaderActions,
  args: {
    matchRequestCount: 0,
    onOpenMatchRequests: fn(),
    onShare: fn(),
  },
  // In place: the title block on the left, the cluster at the upper right (under it on phones).
  render: (args) => (
    <PageHeader
      eyebrow={
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          Live session
        </span>
      }
      title={session.title}
      description={session.venueName}
      actions={<ConsoleHeaderActions {...args} />}
    />
  ),
} satisfies Meta<typeof ConsoleHeaderActions>

export default meta
type Story = StoryObj<typeof meta>

/** No match requests: the hand button without a badge, then Share. */
export const NoMatchRequests: Story = {}
export const NoMatchRequestsLight: Story = { globals: { theme: 'light' } }

/** Match requests waiting: warn-coloured hand button with the count badge. */
export const MatchRequestsWaiting: Story = { args: { matchRequestCount: matchRequests.length } }
export const MatchRequestsWaitingLight: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { theme: 'light' },
}

/** A long count (12) still fits the badge and the pill. */
export const LongCount: Story = { args: { matchRequestCount: 12 } }
export const LongCountLight: Story = {
  args: { matchRequestCount: 12 },
  globals: { theme: 'light' },
}

/** Both buttons call their handlers. */
export const Actions: Story = {
  args: { matchRequestCount: 2 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Match requests · 2 waiting' }))
    await expect(args.onOpenMatchRequests).toHaveBeenCalledTimes(1)
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }))
    await expect(args.onShare).toHaveBeenCalledTimes(1)
  },
}

/** Phone: a full-width Match requests button with the words and the count pill, then Share. */
export const Phone: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { viewport: { value: 'phone' } },
}
export const PhoneLight: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const PhoneNone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLongCount: Story = {
  args: { matchRequestCount: 12 },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { viewport: { value: 'desktop' } },
}
