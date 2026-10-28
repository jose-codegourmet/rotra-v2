import { resultSlideFixtures } from '@rotra/data/fixtures/result-slides'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { OffDaySlide } from './OffDaySlide'

const { frame, offDay, longNames } = resultSlideFixtures

const meta = {
  title: 'Queue/ResultSlides/OffDaySlide',
  component: OffDaySlide,
  args: {
    club: frame.club,
    sessionLine: frame.sessionLine,
    venue: frame.venue,
    rows: offDay,
    variant: 'private',
  },
} satisfies Meta<typeof OffDaySlide>

export default meta
type Story = StoryObj<typeof meta>

export const OffDayPrivateWithNames: Story = { globals: { viewport: { value: 'desktop' } } }
export const OffDayPrivateWithNamesPhone: Story = { globals: { viewport: { value: 'phone' } } }
export const OffDayPublic: Story = { args: { variant: 'public' } }
export const OffDayEmpty: Story = { args: { rows: [] } }
export const OffDayPublicEmpty: Story = { args: { variant: 'public', rows: [] } }
export const LongNames: Story = {
  args: {
    club: longNames.frame.club,
    sessionLine: longNames.frame.sessionLine,
    venue: longNames.frame.venue,
    rows: longNames.offDay,
  },
  globals: { viewport: { value: 'phone' } },
}
