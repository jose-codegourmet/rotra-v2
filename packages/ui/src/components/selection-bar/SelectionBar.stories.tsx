import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SelectionBar, type SelectionBarPlayer } from './SelectionBar'

// Picks in pick order, from the console fixture's roster (present players off court first).
const picks: SelectionBarPlayer[] = consoleSessionFixture.roster.map((p) => ({
  id: p.id,
  name: p.nameSnapshot,
}))
const pick = (n: number) => picks.slice(4, 4 + n)

const meta = {
  title: 'Queue/SelectionBar',
  component: SelectionBar,
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
  args: {
    players: pick(4),
    label: 'Doubles',
    valid: true,
    onClear: fn(),
    onMakeMatch: fn(),
  },
} satisfies Meta<typeof SelectionBar>

export default meta
type Story = StoryObj<typeof meta>

/** Four picked with doubles on: Make match is enabled */
export const ValidDoubles: Story = {}
/** Six picked: a fun format that counts toward session games only */
export const ValidFun: Story = {
  args: { players: pick(6), label: '3v3 fun, counts toward session games only' },
}
/** One picked: the count cannot make a match */
export const InvalidCount: Story = {
  args: { players: pick(1), label: 'pick 2, 3, 4, 6, 8 or 10 players', valid: false },
}
/** Two picked while singles is off for this session */
export const SinglesOff: Story = {
  args: { players: pick(2), label: 'singles is off for this session', valid: false },
}
/** Four picked while doubles is off for this session */
export const DoublesOff: Story = {
  args: { players: pick(4), label: 'doubles is off for this session', valid: false },
}
/** No onMakeMatch: only Clear shows */
export const WithoutMakeMatch: Story = { args: { onMakeMatch: undefined } }
/** Ten picked for 5v5: the faces stack */
export const TenPicked: Story = {
  args: { players: pick(10), label: '5v5 fun, counts toward session games only' },
}

/** At 375 px the actions wrap under the faces and the buttons are 44 px tall */
export const Phone: Story = {
  args: { players: pick(6), label: '3v3 fun, counts toward session games only' },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
