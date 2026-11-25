import { resultExportFixtures } from '@rotra/data/fixtures/result-exports'
import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import { paginateStandings } from '@rotra/data/session-result/sessionResult.rules'
import { AwardsSlide } from '@rotra/ui/awards-slide'
import { StandingsSlide } from '@rotra/ui/standings-slide'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExportFramePreview } from './ExportFramePreview'

const { standingsRows30 } = resultExportFixtures
const { frame, mvp, mostImproved } = resultSlideFixtures
const page = (format: 'story' | 'feed') => {
  const first = paginateStandings(standingsRows30, format)[0]
  if (!first) throw new Error('Missing standings page.')
  return first
}
const storyPage = page('story')
const feedPage = page('feed')

const meta = {
  title: 'Queue/ExportImagesSheet/ExportFramePreview',
  component: ExportFramePreview,
  args: {
    format: 'story',
    label: storyPage.title,
    children: (
      <StandingsSlide
        {...frame}
        rows={storyPage.rows}
        page={{ n: storyPage.page, of: storyPage.pages }}
      />
    ),
  },
} satisfies Meta<typeof ExportFramePreview>

export default meta
type Story = StoryObj<typeof meta>

/** The first Story standings image, scaled down, with its shared positions on one row each. */
export const StoryStandings: Story = {}
export const StoryStandingsLight: Story = { globals: { theme: 'light' } }

/** The first Feed post standings image (9 rows). */
export const FeedStandings: Story = {
  args: {
    format: 'feed',
    label: feedPage.title,
    children: (
      <StandingsSlide
        {...frame}
        rows={feedPage.rows}
        page={{ n: feedPage.page, of: feedPage.pages }}
      />
    ),
  },
}

export const Awards: Story = {
  args: {
    label: 'Awards',
    children: <AwardsSlide {...frame} mvp={mvp} mostImproved={mostImproved} showFormulaNote />,
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
