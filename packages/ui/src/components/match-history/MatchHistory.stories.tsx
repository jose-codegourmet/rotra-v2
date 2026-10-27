import { MIGS_SESSIONS } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { MatchHistory } from './MatchHistory'

const meta = { title: 'Player/MatchHistory', component: MatchHistory } satisfies Meta<
  typeof MatchHistory
>
export default meta
type Story = StoryObj<typeof meta>
export const Counted: Story = {
  args: { sessions: MIGS_SESSIONS, activeTab: 'counted', onTabChange: () => {} },
  render: function Render(args) {
    const [tab, setTab] = useState(args.activeTab)
    return <MatchHistory {...args} activeTab={tab} onTabChange={setTab} />
  },
}
export const FunAndPartial: Story = { ...Counted, args: { ...Counted.args, activeTab: 'other' } }
export const EmptyCounted: Story = {
  args: { sessions: [], activeTab: 'counted', onTabChange: () => {} },
}
export const EmptyFun: Story = { args: { sessions: [], activeTab: 'other', onTabChange: () => {} } }
export const Reassessment: Story = {
  args: {
    ...Counted.args,
    notices: [
      'None of these games are from the last three months, so they no longer count toward the leaderboard.',
    ],
  },
}
export const Processing: Story = {
  args: {
    ...Counted.args,
    notices: [
      'Sunday Night Queue games are in, but the rank update from them is still processing.',
    ],
  },
}
