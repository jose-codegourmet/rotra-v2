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
    onOpenCourtsAndTime: fn(),
    onOpenPayments: fn(),
    onOpenPublicPage: fn(),
    onCopyFacebookPost: fn(),
    onOpenSessionSettings: fn(),
    onGoHome: fn(),
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

const openMore = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: 'More for this session' }),
  )
  const body = within(canvasElement.ownerDocument.body)
  await expect(body.getByRole('menuitem', { name: 'Public page' })).toHaveFocus()
}

/** No match requests: a plain "Match requests · 0" button. */
export const NoMatchRequests: Story = {}
export const NoMatchRequestsLight: Story = { globals: { theme: 'light' } }

/** Match requests waiting: the button turns the warn colour, bold. */
export const MatchRequestsWaiting: Story = { args: { matchRequestCount: matchRequests.length } }
export const MatchRequestsWaitingLight: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { theme: 'light' },
}

/** The ⋯ More menu open: Public page, Copy Facebook post, Session settings, Home. */
export const MoreMenuOpen: Story = { play: openMore }
export const MoreMenuOpenLight: Story = { play: openMore, globals: { theme: 'light' } }

/** Escape closes the menu and returns focus to the ⋯ button. */
export const MoreMenuEscape: Story = {
  play: async (context) => {
    await openMore(context)
    await userEvent.keyboard('{Escape}')
    const body = within(context.canvasElement.ownerDocument.body)
    await expect(body.queryByRole('menu')).toBeNull()
    await expect(
      within(context.canvasElement).getByRole('button', { name: 'More for this session' }),
    ).toHaveFocus()
  },
}

/** A tap outside closes the menu. */
export const MoreMenuOutsideTap: Story = {
  play: async (context) => {
    await openMore(context)
    await userEvent.click(context.canvasElement.ownerDocument.body)
    const body = within(context.canvasElement.ownerDocument.body)
    await expect(body.queryByRole('menu')).toBeNull()
  },
}

export const Phone: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { viewport: { value: 'phone' } },
}
export const PhoneLight: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const Desktop: Story = {
  args: { matchRequestCount: matchRequests.length },
  globals: { viewport: { value: 'desktop' } },
}
