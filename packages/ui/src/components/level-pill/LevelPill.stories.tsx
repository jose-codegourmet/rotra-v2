import { PLAYING_LEVELS } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LevelPill } from './LevelPill'

const meta = {
  title: 'Queue/LevelPill',
  component: LevelPill,
  args: { level: 'intermediate_mid' },
} satisfies Meta<typeof LevelPill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoLevel: Story = { args: { level: null } }

export const AllLevels: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      {PLAYING_LEVELS.map((level) => (
        <LevelPill key={level} level={level} />
      ))}
      <LevelPill level={null} />
    </div>
  ),
}
