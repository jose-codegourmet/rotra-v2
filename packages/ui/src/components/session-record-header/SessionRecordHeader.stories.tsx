import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { QueueSession } from '@rotra/data/queue-session/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionRecordHeader, type SessionRecordHeaderProps } from './SessionRecordHeader'

// The prototype's fmtDate · fmtTime–fmtTime and fmtDur.
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const fmtDur = (a: number, b: number) => {
  let m = Math.round((b - a) / 60000)
  if (m <= 0) m += 1440
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}

const sessionById = (id: string): QueueSession => {
  const s = queueSessionFixtures.sessions.find((x) => x.id === id)
  if (!s) throw new Error(`No session ${id} in fixtures`)
  return s
}
const courtsOf = (id: string) =>
  queueSessionFixtures.courts.filter((c) => c.sessionId === id).length

// Game and player counts are not in the F06.2 fixtures; these are the prototype's simulated totals
// for Thursday Open Play (h1), Sunday Night Queue (h2) and Tuesday Drills (h3).
const propsFor = (
  id: string,
  totals: Pick<SessionRecordHeaderProps['totals'], 'games' | 'invalidGames' | 'players'>,
): SessionRecordHeaderProps => {
  const s = sessionById(id)
  return {
    title: s.title,
    when: `${fmtDate(s.scheduledStartAt)} · ${fmtTime(s.scheduledStartAt)}–${fmtTime(s.scheduledEndAt)}`,
    venue: s.venueName,
    state: s.state === 'invalid' ? 'invalid' : 'completed',
    totals: {
      ...totals,
      courts: courtsOf(id),
      length: fmtDur(s.scheduledStartAt, s.scheduledEndAt),
    },
  }
}

const meta = {
  title: 'Queue/SessionRecordHeader',
  component: SessionRecordHeader,
  args: { ...propsFor('h1', { games: 23, invalidGames: 1, players: 18 }), published: true },
} satisfies Meta<typeof SessionRecordHeader>

export default meta
type Story = StoryObj<typeof meta>

/** Thursday Open Play: Completed + Results published, 23 games with one invalid */
export const CompletedPublished: Story = {}

/** Sunday Night Queue: Completed + Results private; the Games tile shows the invalid count */
export const CompletedPrivateWithInvalidGames: Story = {
  args: { ...propsFor('h2', { games: 19, invalidGames: 2, players: 15 }), published: false },
}

/** Tuesday Drills: only the Invalid session chip; Games shows "—" and published is ignored */
export const InvalidSession: Story = {
  args: { ...propsFor('h3', { games: null, invalidGames: 0, players: 12 }), published: true },
}

/** A long title wraps under the label; nothing scrolls sideways at 375 px */
export const LongTitle: Story = {
  args: {
    title: 'Thursday Open Play · RK regulars and guests · doubles only · bring your own racket',
  },
  globals: { viewport: { value: 'phone' } },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
