import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardSearch } from './LeaderboardSearch'

const meta = {
  title: 'Player/LeaderboardSearch',
  component: LeaderboardSearch,
  args: { value: '', onChange: () => undefined, onFindId: () => undefined },
} satisfies Meta<typeof LeaderboardSearch>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const NameQuery: Story = { args: { value: 'Migs' } }
export const RtrId: Story = { args: { value: 'RTR-PH-CEB-031526-0001' } }
export const InvalidId: Story = { args: { value: 'RTR-PH-XXX', error: 'Enter a full RTR ID.' } }
