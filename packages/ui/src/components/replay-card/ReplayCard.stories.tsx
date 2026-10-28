import { sessionRecordFixture } from '@rotra/data/fixtures/session-record'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ReplayCard } from './ReplayCard'

const { replay } = sessionRecordFixture

const meta = {
  title: 'Queue/ReplayCard',
  component: ReplayCard,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[1240px]">
        <Story />
      </div>
    ),
  ],
  args: {
    courts: replay.start.courts,
    from: replay.from,
    to: replay.to,
    value: replay.start.value,
    playing: false,
    summary: replay.start.summary,
    onSeek: fn(),
    onTogglePlay: fn(),
    onSelectPlayer: fn(),
  },
} satisfies Meta<typeof ReplayCard>

export default meta
type Story = StoryObj<typeof meta>

/** The first match has just started; the other courts are still free. */
export const Start: Story = {}

/** Halfway through Thursday Open Play with at least two courts busy. */
export const MidNightTwoCourtsBusy: Story = {
  name: 'Mid-night two courts busy',
  args: { courts: replay.mid.courts, value: replay.mid.value, summary: replay.mid.summary },
}

/** The last match has ended: every court is free and the slider sits at the end. */
export const End: Story = {
  args: { courts: replay.end.courts, value: replay.end.value, summary: replay.end.summary },
}

/** While the container's timer runs the button reads "Pause replay". */
export const Playing: Story = {
  args: {
    courts: replay.mid.courts,
    value: replay.mid.value,
    summary: replay.mid.summary,
    playing: true,
  },
}

export const Phone: Story = {
  args: { courts: replay.mid.courts, value: replay.mid.value, summary: replay.mid.summary },
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  args: { courts: replay.mid.courts, value: replay.mid.value, summary: replay.mid.summary },
  globals: { viewport: { value: 'desktop' } },
}
