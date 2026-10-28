import { resultExportFixtures } from '@rotra/data/fixtures/result-exports'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ExportImagesSheet } from './ExportImagesSheet'

const { clubName, storyFrames30, feedFrames30, awardsOnlyFrames, withOffDayFrames } =
  resultExportFixtures

const meta = {
  title: 'Queue/ExportImagesSheet',
  component: ExportImagesSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    format: 'story',
    selection: { standings: true, awards: true, includeOffDay: false },
    frames: storyFrames30,
    clubName,
    onFormatChange: fn(),
    onSelectionChange: fn(),
    onDownload: fn(),
    downloadEnabled: true,
  },
} satisfies Meta<typeof ExportImagesSheet>

export default meta
type Story = StoryObj<typeof meta>

/** 30 players as Story images: three standings frames (14, 14, 2) plus Awards, four images. */
export const Story30Players: Story = {}

/** 30 players as Feed post images: three standings frames of 10 plus Awards. */
export const Feed30Players: Story = { args: { format: 'feed', frames: feedFrames30 } }

/** Only Awards ticked: one image. */
export const AwardsOnly: Story = {
  args: {
    selection: { standings: false, awards: true, includeOffDay: false },
    frames: awardsOnlyFrames,
  },
}

/** Off Day explicitly included: the Off Day frame joins the previews. */
export const WithOffDay: Story = {
  args: {
    selection: { standings: true, awards: true, includeOffDay: true },
    frames: withOffDayFrames,
  },
}

/** Nothing ticked: no previews and Download 0 images disabled. */
export const NothingSelected: Story = {
  args: {
    selection: { standings: false, awards: false, includeOffDay: false },
    frames: [],
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
