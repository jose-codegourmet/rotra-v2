import { rankStatusExamples } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RankStatusChip } from './RankStatusChip'

const meta = {
  title: 'Admin/RankStatusChip',
  component: RankStatusChip,
  args: { status: rankStatusExamples.none },
} satisfies Meta<typeof RankStatusChip>

export default meta
type Story = StoryObj<typeof meta>

export const None: Story = {}
export const Below: Story = { args: { status: rankStatusExamples.below } }
export const Board: Story = { args: { status: rankStatusExamples.board } }

const all = (
  <div className="flex flex-wrap gap-2">
    {Object.entries(rankStatusExamples).map(([key, status]) => (
      <RankStatusChip key={key} status={status} />
    ))}
  </div>
)
export const AllStates: Story = { render: () => all }
export const AllStatesLight: Story = { render: () => all, globals: { theme: 'light' } }
