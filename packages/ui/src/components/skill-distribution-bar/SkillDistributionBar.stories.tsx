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

/** Mixed roster: Beginner blue, Intermediate yellow, Advanced red. Hover or Tab to a segment for its count. */
export const Default: Story = {}
/** Grey No level segment sits last. */
export const WithUnrated: Story = {
  args: { counts: { beginner: 3, intermediate: 4, advanced: 2, unrated: 2 } },
}
/** Only unrated players: one grey segment. */
export const NoLevelOnly: Story = {
  args: { counts: { beginner: 0, intermediate: 0, advanced: 0, unrated: 5 } },
}
/** One group only: a single full-width rounded segment. */
export const OneGroupOnly: Story = {
  args: { counts: { beginner: 0, intermediate: 6, advanced: 0 } },
}
/** Singular tooltip: "Advanced: 1 player". */
export const SinglePlayer: Story = {
  args: { counts: { beginner: 0, intermediate: 0, advanced: 1 } },
}
/** Tiny group next to a big one keeps a visible minimum width. */
export const LopsidedRoster: Story = {
  args: { counts: { beginner: 1, intermediate: 30, advanced: 1 } },
}
export const Empty: Story = {
  args: { counts: { beginner: 0, intermediate: 0, advanced: 0, unrated: 0 } },
}
export const CustomLabel: Story = { args: { label: 'Who is coming' } }
