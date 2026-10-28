import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardList } from './LeaderboardList'

const rows = leaderboardEntries.slice(3, 8)
const meta = { title: 'Player/LeaderboardList', component: LeaderboardList } satisfies Meta<
  typeof LeaderboardList
>
export default meta
type Story = StoryObj<typeof meta>
const noop = () => undefined

export const Rows: Story = {
  render: () => (
    <LeaderboardList>
      {rows.map((entry, index) => (
        <LeaderboardRow
          key={entry.id}
          position={index + 4}
          fullName={entry.fullName}
          nickname={entry.nickname}
          levelLabel="Advanced High"
          onSelect={noop}
        />
      ))}
    </LeaderboardList>
  ),
}
export const Loading: Story = { args: { loading: true } }
export const FooterWithMore: Story = {
  render: () => (
    <LeaderboardList shown={25} total={1_284} onShowMore={noop}>
      {rows.map((entry, index) => (
        <LeaderboardRow
          key={entry.id}
          position={index + 4}
          fullName={entry.fullName}
          nickname={entry.nickname}
          levelLabel="Advanced High"
          onSelect={noop}
        />
      ))}
    </LeaderboardList>
  ),
}
export const FooterComplete: Story = { args: { shown: 1_284, total: 1_284, children: null } }

export const Refreshing: Story = { args: { busy: true } }
