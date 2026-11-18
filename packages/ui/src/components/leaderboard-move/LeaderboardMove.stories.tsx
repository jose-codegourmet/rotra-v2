import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardMove } from './LeaderboardMove'

const meta = {
  title: 'Player/LeaderboardMove',
  component: LeaderboardMove,
  decorators: [(Story) => <div className="px-6 pt-12">{Story()}</div>],
  args: { period: 'week', position: 4, previousPosition: 7 },
} satisfies Meta<typeof LeaderboardMove>

export default meta
type Story = StoryObj<typeof meta>

export const Up: Story = {}
export const Down: Story = { args: { period: 'month', position: 7, previousPosition: 5 } }
export const Same: Story = { args: { period: 'year', previousPosition: 4 } }
export const New: Story = { args: { previousPosition: null } }
export const NewWithTooltip: Story = {
  ...New,
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole('img'))
  },
}
