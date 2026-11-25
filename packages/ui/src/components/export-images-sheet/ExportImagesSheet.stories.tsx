import { resultExportFixtures } from '@rotra/data/fixtures/result-exports'
import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import { paginateStandings } from '@rotra/data/session-result/sessionResult.rules'
import { AwardsSlide } from '@rotra/ui/awards-slide'
import { OffDaySlide } from '@rotra/ui/off-day-slide'
import { StandingsSlide } from '@rotra/ui/standings-slide'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  type ExportImagesFormat,
  type ExportImagesPreview,
  ExportImagesSheet,
} from './ExportImagesSheet'

const { standingsRows30, offDayNames } = resultExportFixtures
const { frame, mvp, mostImproved } = resultSlideFixtures

const standings = (format: ExportImagesFormat): ExportImagesPreview[] =>
  paginateStandings(standingsRows30, format).map((page) => ({
    key: `standings-${page.page}`,
    label: page.title,
    image: <StandingsSlide {...frame} rows={page.rows} page={{ n: page.page, of: page.pages }} />,
  }))
const awards: ExportImagesPreview = {
  key: 'awards',
  label: 'Awards',
  image: <AwardsSlide {...frame} mvp={mvp} mostImproved={mostImproved} showFormulaNote />,
}
const offDay: ExportImagesPreview = {
  key: 'off-day',
  label: 'Off Day',
  image: (
    <OffDaySlide
      {...frame}
      variant="public"
      rows={offDayNames.map((name) => ({ name, priorSessions: 6 }))}
    />
  ),
}

const meta = {
  title: 'Queue/ExportImagesSheet',
  component: ExportImagesSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    format: 'story',
    selection: { standings: true, awards: true, includeOffDay: false },
    previews: [...standings('story'), awards],
    onFormatChange: fn(),
    onSelectionChange: fn(),
    onDownload: fn(),
    downloadEnabled: true,
  },
} satisfies Meta<typeof ExportImagesSheet>

export default meta
type Story = StoryObj<typeof meta>

/** 30 players with 2-, 3- and 6-way ties as Story images: standings pages plus Awards. */
export const Story30Players: Story = {}
export const Story30PlayersLight: Story = { globals: { theme: 'light' } }

/** The same players as Feed post images: 9 rows per image, a tie never split. */
export const Feed30Players: Story = {
  args: { format: 'feed', previews: [...standings('feed'), awards] },
}

/** Only Awards ticked: one image. */
export const AwardsOnly: Story = {
  args: {
    selection: { standings: false, awards: true, includeOffDay: false },
    previews: [awards],
  },
}

/** Off Day explicitly included: the Off Day image joins the previews. */
export const WithOffDay: Story = {
  args: {
    selection: { standings: true, awards: true, includeOffDay: true },
    previews: [...standings('story'), awards, offDay],
  },
}

/** Nothing ticked: no previews and Download 0 images disabled. */
export const NothingSelected: Story = {
  args: {
    selection: { standings: false, awards: false, includeOffDay: false },
    previews: [],
  },
}

/** Downloading turned off, as in the prototype. */
export const DownloadDisabled: Story = {
  args: {
    downloadEnabled: false,
    disabledReason: 'Downloading is turned off in this prototype.',
  },
}

/** At 375 px the previews scroll inside their own row; the page never scrolls sideways. */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
