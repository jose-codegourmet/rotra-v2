import { venues } from '@rotra/data/fixtures/venues'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VenueCard } from './VenueCard'

const [banilad, lahug, talamban] = venues
if (!banilad || !lahug || !talamban) throw new Error('Venue fixtures missing')

// Session counts and the next session come with Q01.11 session fixtures; the values are the Queue
// prototype's (Sunday Night Queue at Banilad Sports Hub).
const meta = {
  title: 'Queue/VenueCard',
  component: VenueCard,
  decorators: [
    (Story) => (
      <div className="max-w-[340px]">
        <Story />
      </div>
    ),
  ],
  args: {
    name: banilad.name,
    address: banilad.address,
    courtFeeMinor: banilad.courtFeeMinor,
    entranceFeeMinor: banilad.entranceFeeMinor,
    sessionsHere: 2,
    onCreateSession: fn(),
    onEdit: fn(),
  },
} satisfies Meta<typeof VenueCard>

export default meta
type Story = StoryObj<typeof meta>

export const WithFees: Story = {
  args: {
    name: talamban.name,
    address: talamban.address,
    courtFeeMinor: talamban.courtFeeMinor,
    entranceFeeMinor: talamban.entranceFeeMinor,
    sessionsHere: 0,
  },
}
export const WithoutFees: Story = {
  args: { courtFeeMinor: null, entranceFeeMinor: null, address: null },
}
export const NextSession: Story = {
  args: { next: { title: 'Sunday Night Queue', dateLabel: 'Sun, Nov 1' } },
}
export const NothingBooked: Story = {
  args: { name: lahug.name, address: lahug.address, sessionsHere: 0 },
}
export const LongName: Story = {
  args: { name: `${banilad.name} Annex Covered Courts and Multi-Purpose Hall` },
  globals: { viewport: { value: 'phone' } },
}
