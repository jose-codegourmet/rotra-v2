import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicQueueMatchDialog } from './PublicQueueMatchDialog'

const face = (name: string, level: CourtPlayer['level']): CourtPlayer => ({
  id: name,
  name,
  shortName: name,
  level,
})
const doubles = {
  teamA: [face('Maya', 'intermediate_mid'), face('Jun', 'beginner_high')],
  teamB: [face('Dexter', 'advanced_low'), face('Y***', null)],
}
const fiveVFive = {
  teamA: ['Ben', 'Cai', 'Dan', 'Eli', 'Fox'].map((n, i) =>
    face(n, i % 2 ? 'intermediate_low' : 'beginner_mid'),
  ),
  teamB: ['Gus', 'Hal', 'Ian', 'Jay', 'Kit'].map((n, i) =>
    face(n, i % 2 ? 'advanced_mid' : null),
  ),
}

const meta = {
  title: 'Queue/PublicSession/PublicQueueMatchDialog',
  component: PublicQueueMatchDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    position: 3,
    label: 'Mixed Doubles',
    match: doubles,
  },
} satisfies Meta<typeof PublicQueueMatchDialog>
export default meta
type Story = StoryObj<typeof meta>

/** Every story supports dark and light via the theme toolbar. */
export const SmallMatch: Story = {}
/** #1: "Next on a court." */
export const NextMatch: Story = { args: { position: 1 } }
export const SmallMatchLight: Story = { globals: { theme: 'light' } }
export const SmallMatchPhone: Story = { globals: { viewport: { value: 'phone' } } }
/** More than six players: two separate courts, the Uses 2 courts chip, each team split. */
export const TwoCourts: Story = {
  args: { position: 2, label: "Men's 5v5 fun", match: fiveVFive },
}
export const TwoCourtsLight: Story = { ...TwoCourts, globals: { theme: 'light' } }
export const TwoCourtsPhone: Story = { ...TwoCourts, globals: { viewport: { value: 'phone' } } }
/** The match was removed from the queue while the dialog was open. */
export const GoneMatch: Story = { args: { match: null } }
export const GoneMatchLight: Story = { ...GoneMatch, globals: { theme: 'light' } }
