import type { Meta, StoryObj } from '@storybook/react-vite'
import { MatchCourt, type MatchCourtPlayer } from './MatchCourt'

const face = (name: string, label = name.split(' ')[0] ?? name): MatchCourtPlayer => ({
  key: name,
  name,
  label,
  onOpen: () => {},
})
const meta = {
  title: 'Queue/MatchCourt',
  component: MatchCourt,
  args: {
    number: 12,
    timeLabel: '8:10–8:31 PM',
    left: [face('Jose Buctuanon', 'You'), face('Maya Santos')],
    right: [face('Ben Cruz'), face('Y*** R***')],
    winner: 'left',
    score: '21–17',
    mine: true,
  },
} satisfies Meta<typeof MatchCourt>
export default meta
type Story = StoryObj<typeof meta>

export const YourWin: Story = { globals: { theme: 'dark' } }
export const YourWinLight: Story = { globals: { theme: 'light' } }
export const YourLossNoScore: Story = { args: { winner: 'right', score: null } }
export const OtherMatchRightWon: Story = { args: { mine: false, winner: 'right', score: '15–21' } }
export const OnCourtNow: Story = { args: { mine: false, now: true } }
export const FunSingles: Story = {
  args: { fun: true, left: [face('Ben Cruz')], right: [face('Maya Santos')], mine: false },
}
export const Invalid: Story = { args: { invalid: true, winner: null, score: null } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
