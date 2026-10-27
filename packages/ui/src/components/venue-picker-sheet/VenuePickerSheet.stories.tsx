import { venues } from '@rotra/data/fixtures/venues'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { VenuePickerSheet } from './VenuePickerSheet'

const first = venues[0]
if (!first) throw new Error('Venue fixtures missing')

const meta = {
  title: 'Queue/VenuePickerSheet',
  component: VenuePickerSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    venues,
    selectedVenueId: first.id,
    onPick: fn(),
    onEdit: fn(),
    onAddNew: fn(),
  },
} satisfies Meta<typeof VenuePickerSheet>

export default meta
type Story = StoryObj<typeof meta>

export const ThreeVenues: Story = {}
/** Type "Mandaue" to see the add offer. */
export const SearchNoMatch: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Search your venues'), 'Mandaue')
  },
}
export const Empty: Story = { args: { venues: [], selectedVenueId: null } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
