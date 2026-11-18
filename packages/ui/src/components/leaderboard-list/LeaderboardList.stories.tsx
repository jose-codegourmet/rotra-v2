import { leaderboardEntries } from '@rotra/data/fixtures/leaderboard-players'
import type { LeaderboardPeriod } from '@rotra/ui/leaderboard-period-switch'
import { LeaderboardRow } from '@rotra/ui/leaderboard-row'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardList } from './LeaderboardList'

const rows = leaderboardEntries.slice(3, 8)
const meta = {
  title: 'Player/LeaderboardList',
  component: LeaderboardList,
  args: { period: 'year' },
} satisfies Meta<typeof LeaderboardList>
export default meta
type Story = StoryObj<typeof meta>
const noop = () => undefined

const WINS = {
  year: [115, 114, 114, 113, 112],
  month: [14, 14, 13, 13, 12],
  week: [4, 4, 4, 3, 3],
} as const
const PREVIOUS_POSITIONS = [7, 3, 6, null, 5] as const

function renderRows(period: LeaderboardPeriod) {
  return rows.map((entry, index) => (
    <LeaderboardRow
      key={entry.id}
      period={period}
      position={index + 4}
      previousPosition={PREVIOUS_POSITIONS[index]}
      wins={WINS[period][index]}
      fullName={entry.fullName}
      nickname={entry.nickname}
      picture={{ src: entry.pictureUrl ?? undefined }}
      onSelect={noop}
    />
  ))
}

export const Annual: Story = {
  render: (args) => <LeaderboardList {...args}>{renderRows('year')}</LeaderboardList>,
}
export const Monthly: Story = {
  args: { period: 'month' },
  render: (args) => <LeaderboardList {...args}>{renderRows('month')}</LeaderboardList>,
}
export const Weekly: Story = {
  args: { period: 'week' },
  render: (args) => <LeaderboardList {...args}>{renderRows('week')}</LeaderboardList>,
}
export const Loading: Story = { args: { loading: true } }
export const FooterWithMore: Story = {
  args: { shown: 25, total: 50, onShowMore: noop },
  render: Annual.render,
}
export const FooterComplete: Story = { args: { shown: 50, total: 50 }, render: Annual.render }
export const Refreshing: Story = { args: { busy: true }, render: Annual.render }
export const MaskedRows: Story = {
  render: (args) => (
    <LeaderboardList {...args}>
      <LeaderboardRow
        position={6}
        fullName="J*** A***"
        masked
        period="year"
        previousPosition={6}
        wins={114}
      />
    </LeaderboardList>
  ),
}
