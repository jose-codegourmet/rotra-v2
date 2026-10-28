import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResultSlideFrame } from './ResultSlideFrame'

const { frame, longNames } = resultSlideFixtures

const meta = {
  title: 'Queue/ResultSlides/ResultSlideFrame',
  component: ResultSlideFrame,
  args: {
    club: frame.club,
    title: 'Standings',
    sessionLine: frame.sessionLine,
    venue: frame.venue,
    children: <p className="px-3 py-6 text-center text-sm text-fg2">Slide content</p>,
  },
} satisfies Meta<typeof ResultSlideFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const LongNames: Story = {
  args: {
    club: longNames.frame.club,
    sessionLine: longNames.frame.sessionLine,
    venue: longNames.frame.venue,
  },
  globals: { viewport: { value: 'phone' } },
}
