import type { Meta, StoryObj } from '@storybook/react-vite'
import { SkillDistributionBar } from './SkillDistributionBar'

const meta = {
  title: 'Queue/SkillDistributionBar',
  component: SkillDistributionBar,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { counts: { beginner: 3, intermediate: 4, advanced: 2 } },
} satisfies Meta<typeof SkillDistributionBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithUnrated: Story = {
  args: { counts: { beginner: 3, intermediate: 4, advanced: 2, unrated: 2 } },
}
export const OneGroupOnly: Story = {
  args: { counts: { beginner: 0, intermediate: 6, advanced: 0 } },
}
export const SinglePlayer: Story = {
  args: { counts: { beginner: 0, intermediate: 0, advanced: 1 } },
}
export const Empty: Story = {
  args: { counts: { beginner: 0, intermediate: 0, advanced: 0, unrated: 0 } },
}
export const CustomLabel: Story = { args: { label: 'Who is coming' } }
