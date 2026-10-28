import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicResultsSection } from './PublicResultsSection'

const { frame, standings, mvp, mostImproved, offDay } = resultSlideFixtures

const standingsSlide = { ...frame, rows: standings }
const awardsSlide = { ...frame, mvp, mostImproved, showFormulaNote: true }
const offDaySlide = { ...frame, rows: offDay }

const meta = {
  title: 'Queue/PublicResultsSection',
  component: PublicResultsSection,
  args: {
    published: { standings: standingsSlide, awards: awardsSlide },
  },
} satisfies Meta<typeof PublicResultsSection>

export default meta
type Story = StoryObj<typeof meta>

/** The default publication: Standings and Awards, Off Day kept private. */
export const StandingsAndAwards: Story = { globals: { viewport: { value: 'desktop' } } }
export const StandingsAndAwardsPhone: Story = { globals: { viewport: { value: 'phone' } } }

/** Off Day explicitly included: drawn with the public variant, no private band. */
export const WithOffDay: Story = {
  args: { published: { standings: standingsSlide, awards: awardsSlide, offDay: offDaySlide } },
  globals: { viewport: { value: 'desktop' } },
}
export const WithOffDayPhone: Story = {
  args: WithOffDay.args,
  globals: { viewport: { value: 'phone' } },
}

/** Only Standings were selected when publishing. */
export const StandingsOnly: Story = { args: { published: { standings: standingsSlide } } }

/** Before publication: the page never claims there were no games. */
export const NotShared: Story = { args: { published: null } }
export const NotSharedPhone: Story = {
  args: { published: null },
  globals: { viewport: { value: 'phone' } },
}
