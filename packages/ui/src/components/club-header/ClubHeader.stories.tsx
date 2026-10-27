import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubHeader } from './ClubHeader'

const club = clubs[0]
if (!club) throw new Error('Club fixture missing')

const meta = {
  title: 'Queue/ClubHeader',
  component: ClubHeader,
  args: {
    clubName: club.name,
    initials: club.initials,
    logoUrl: null,
    todayLabel: 'Sunday, October 25',
    licenseLine: 'Yearly license · active until Mar 31, 2027',
    foundingLine: `Founded at ${club.foundingAddress}`,
    onCreateSession: fn(),
  },
} satisfies Meta<typeof ClubHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const LongName: Story = {
  args: { clubName: 'Lahug Smash and Shuttle Badminton Association of Cebu' },
  globals: { viewport: { value: 'phone' } },
}
