import { JOSE_SESSIONS } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ProfileSessionsCard, SessionRecordList } from './ProfileSessionsCard'

const meta = {
  title: 'Player/ProfileSessionsCard',
  component: ProfileSessionsCard,
  args: { sessions: JOSE_SESSIONS, onOpenSession: fn(), onOpenAll: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof ProfileSessionsCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const FewerThanThree: Story = { args: { sessions: JOSE_SESSIONS.slice(0, 2) } }
export const NoSessions: Story = { args: { sessions: [] } }
export const NoSessionsLight: Story = { args: { sessions: [] }, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
/**
 * A not ranked session (Record games off): its games count in the session's own record, 2W · 1L.
 * The Not ranked chip shows in the session matches dialog and on the Games page.
 */
export const NotRanked: Story = {
  args: { sessions: JOSE_SESSIONS.filter((session) => session.ranked === false) },
  globals: { theme: 'dark' },
}
export const NotRankedLight: Story = { ...NotRanked, globals: { theme: 'light' } }
/** The Sessions page's list: every session, the same rows */
export const AllSessionsList: Story = {
  render: (args) => (
    <SessionRecordList sessions={args.sessions} onOpenSession={args.onOpenSession} />
  ),
}
