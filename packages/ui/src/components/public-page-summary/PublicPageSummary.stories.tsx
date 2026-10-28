import { sessionRecordFixture } from '@rotra/data/fixtures/session-record'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicPageSummary } from './PublicPageSummary'

const { session, playerCards, minimumGames } = sessionRecordFixture

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const formats =
  session.allowSingles && session.allowDoubles
    ? 'Singles + Doubles'
    : session.allowDoubles
      ? 'Doubles'
      : session.allowSingles
        ? 'Singles'
        : 'No standard format'
const MODE_LABEL = { chill: 'Chill', fair: 'Fair', hard: 'Hard' } as const
const publishedAt = (session.finalizedAt ?? session.scheduledEndAt) + 14 * 60_000

const meta = {
  title: 'Queue/PublicPageSummary',
  component: PublicPageSummary,
  args: {
    invalid: false,
    details: {
      when: `${fmtDate(session.scheduledStartAt)}, ${fmtTime(session.scheduledStartAt)}–${fmtTime(session.scheduledEndAt)}`,
      venue: session.venueName,
      courts: sessionRecordFixture.replay.start.courts.length,
      formats,
      mode: MODE_LABEL[session.sessionMode],
      minimum: minimumGames,
    },
    publication: {
      standings: true,
      awards: true,
      offDay: false,
      publishedAt: `${fmtDate(publishedAt)} · ${fmtTime(publishedAt)}`,
    },
    participantCount: playerCards.length,
    // The participant cards (ParticipantCard, Q09.1) are passed as children by the container.
    children: null,
    onOpenPublicPage: fn(),
    onPublish: fn(),
  },
} satisfies Meta<typeof PublicPageSummary>

export default meta
type Story = StoryObj<typeof meta>

/** Standings and Awards on the page, Off Day private: the primary action reads Update publication. */
export const Published: Story = { globals: { viewport: { value: 'desktop' } } }
export const PublishedPhone: Story = { globals: { viewport: { value: 'phone' } } }

/** Off Day explicitly included in the publication. */
export const PublishedWithOffDay: Story = {
  args: {
    publication: {
      standings: true,
      awards: true,
      offDay: true,
      publishedAt: `${fmtDate(publishedAt)} · ${fmtTime(publishedAt)}`,
    },
  },
}

/** Before publication: the primary action reads Publish results. */
export const NotShared: Story = {
  args: { publication: null },
  globals: { viewport: { value: 'desktop' } },
}
export const NotSharedPhone: Story = {
  args: { publication: null },
  globals: { viewport: { value: 'phone' } },
}

/** Invalid session: no results to share and no publish action. */
export const Invalid: Story = {
  args: { invalid: true, publication: null },
  globals: { viewport: { value: 'desktop' } },
}
export const InvalidPhone: Story = {
  args: { invalid: true, publication: null },
  globals: { viewport: { value: 'phone' } },
}
