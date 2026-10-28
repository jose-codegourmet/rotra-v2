import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AwardsSlide } from './AwardsSlide'

const { frame, mvp, mostImproved, longNames } = resultSlideFixtures

const meta = {
  title: 'Queue/ResultSlides/AwardsSlide',
  component: AwardsSlide,
  args: {
    club: frame.club,
    sessionLine: frame.sessionLine,
    venue: frame.venue,
    mvp,
    mostImproved,
    showFormulaNote: true,
  },
} satisfies Meta<typeof AwardsSlide>

export default meta
type Story = StoryObj<typeof meta>

export const AwardsBoth: Story = { globals: { viewport: { value: 'desktop' } } }
export const AwardsBothPhone: Story = { globals: { viewport: { value: 'phone' } } }
export const AwardsNone: Story = { args: { mvp: null, mostImproved: null } }
export const MvpOnly: Story = { args: { mostImproved: null } }
export const WithoutFormulaNote: Story = { args: { showFormulaNote: false } }
export const LongNames: Story = {
  args: {
    club: longNames.frame.club,
    sessionLine: longNames.frame.sessionLine,
    venue: longNames.frame.venue,
    mvp: longNames.mvp,
    mostImproved: longNames.mostImproved,
  },
  globals: { viewport: { value: 'phone' } },
}
