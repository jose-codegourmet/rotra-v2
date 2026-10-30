import {
  rankingPolicyConflictVersion2,
  rankingPolicyVersion1,
} from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RankingInEffectCard } from './RankingInEffectCard'

const meta = {
  title: 'Admin/RankingInEffectCard',
  component: RankingInEffectCard,
  args: { effective: rankingPolicyVersion1, versions: [rankingPolicyVersion1] },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RankingInEffectCard>

export default meta
type Story = StoryObj<typeof meta>

/** Version 1 (70% / 30%, 10 matches) is the only saved version. */
export const OneVersion: Story = {}
/** Version 2 was saved from another browser (the prototype's conflict toggle); it is listed first. */
export const TwoVersions: Story = {
  args: {
    effective: rankingPolicyConflictVersion2,
    versions: [rankingPolicyVersion1, rankingPolicyConflictVersion2],
  },
}
export const Phone: Story = { ...TwoVersions, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...TwoVersions, globals: { viewport: { value: 'desktop' } } }
export const OneVersionLight: Story = { globals: { theme: 'light' } }
export const TwoVersionsLight: Story = { ...TwoVersions, globals: { theme: 'light' } }
