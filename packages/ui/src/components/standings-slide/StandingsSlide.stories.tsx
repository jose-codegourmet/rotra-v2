import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { StandingsSlide } from './StandingsSlide'

const { frame, standings, longNames } = resultSlideFixtures

const meta = {
  title: 'Queue/ResultSlides/StandingsSlide',
  component: StandingsSlide,
  args: {
    club: frame.club,
    sessionLine: frame.sessionLine,
    venue: frame.venue,
    rows: standings,
  },
} satisfies Meta<typeof StandingsSlide>

export default meta
type Story = StoryObj<typeof meta>

/** The h1 Thursday Open Play night: 18 players with counted games. */
export const Standings18Players: Story = { globals: { viewport: { value: 'desktop' } } }
export const Standings18PlayersPhone: Story = { globals: { viewport: { value: 'phone' } } }
export const StandingsEmpty: Story = { args: { rows: [] } }
export const LongNames: Story = {
  args: {
    club: longNames.frame.club,
    sessionLine: longNames.frame.sessionLine,
    venue: longNames.frame.venue,
    rows: longNames.standings,
  },
  globals: { viewport: { value: 'phone' } },
}
