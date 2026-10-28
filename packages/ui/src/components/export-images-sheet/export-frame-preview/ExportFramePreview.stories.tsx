import { resultExportFixtures } from '@rotra/data/fixtures/result-exports'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExportFramePreview } from './ExportFramePreview'

const { clubName, storyFrames30, feedFrames30, awardsRows, offDayNames } = resultExportFixtures
const storyStandings = storyFrames30[0]
const feedStandings = feedFrames30[0]
if (!storyStandings || !feedStandings) throw new Error('Missing export frame fixture.')

const meta = {
  title: 'Queue/ExportImagesSheet/ExportFramePreview',
  component: ExportFramePreview,
  args: {
    format: 'story',
    clubName,
    title: storyStandings.title,
    rows: storyStandings.rows,
  },
} satisfies Meta<typeof ExportFramePreview>

export default meta
type Story = StoryObj<typeof meta>

/** A Story frame with its 14 standings rows. */
export const StoryStandings: Story = {}

/** A Feed post frame with its 10 standings rows. */
export const FeedStandings: Story = {
  args: { format: 'feed', title: feedStandings.title, rows: feedStandings.rows },
}

export const Awards: Story = { args: { title: 'Awards', rows: awardsRows } }

export const OffDay: Story = { args: { format: 'feed', title: 'Off Day', rows: offDayNames } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
