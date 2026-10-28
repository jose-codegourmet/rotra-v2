import { resultExportFixtures } from '@rotra/data/fixtures/result-exports'
import { formatShortDate } from '@rotra/ui/now-card/helpers'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ResultsHeader } from './ResultsHeader'

const { session, gameCount } = resultExportFixtures

const meta = {
  title: 'Queue/ResultsHeader',
  component: ResultsHeader,
  args: {
    title: session.title,
    date: formatShortDate(session.scheduledStartAt),
    venue: session.venueName,
    gameCount,
    published: false,
    onMatchHistory: fn(),
    onViewPublicPage: fn(),
    onDownloadImages: fn(),
    onPublish: fn(),
  },
} satisfies Meta<typeof ResultsHeader>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing published yet: Publish results, "Club results private", "Off Day private". */
export const Private: Story = {}

/** Published with Off Day explicitly included: Update publication, both chips in their shared state. */
export const PublishedWithOffDayShared: Story = {
  args: { published: true, offDayShared: true },
}

/** Published without Off Day: "Club results published" but "Off Day private". */
export const PublishedOffDayPrivate: Story = {
  args: { published: true, offDayShared: false },
}

/** At 375 px the action row becomes a two-column grid. */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const PublishedPhone: Story = {
  args: { published: true, offDayShared: true },
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
