import type { Meta, StoryObj } from '@storybook/react-vite'
import { SkillLadder } from './SkillLadder'

const meta = {
  title: 'Player/SkillLadder',
  component: SkillLadder,
  args: { level: 5 },
} satisfies Meta<typeof SkillLadder>
export default meta
type Story = StoryObj<typeof meta>
export const Intermediate: Story = {}
export const Stale: Story = { args: { stale: true } }
export const Empty: Story = { args: { level: null } }
