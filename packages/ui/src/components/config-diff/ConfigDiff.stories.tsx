import { rankingPolicyVersion1 } from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConfigDiff, type ConfigDiffRow } from './ConfigDiff'

const effective = {
  assessment: rankingPolicyVersion1.assessmentWeightBp / 100,
  performance: rankingPolicyVersion1.performanceWeightBp / 100,
  threshold: rankingPolicyVersion1.recentStandardMatchThreshold,
}

/** The D-CONFIG rows for version 1 against a draft. */
function rowsTo(draft: typeof effective): ConfigDiffRow[] {
  return [
    { label: 'Club assessment', from: effective.assessment, to: draft.assessment, unit: '%' },
    { label: 'Match performance', from: effective.performance, to: draft.performance, unit: '%' },
    {
      label: 'Leaderboard requirement',
      from: effective.threshold,
      to: draft.threshold,
      unit: ' matches',
    },
  ]
}

const meta = {
  title: 'Admin/ConfigDiff',
  component: ConfigDiff,
  args: { rows: rowsTo({ ...effective, assessment: 60, performance: 40 }) },
} satisfies Meta<typeof ConfigDiff>

export default meta
type Story = StoryObj<typeof meta>

/** 70% / 30% → 60% / 40%; the leaderboard requirement stays at 10 matches. */
export const WeightsChanged: Story = {}
/** Only the leaderboard requirement changes, 10 → 12 matches. */
export const ThresholdChanged: Story = { args: { rows: rowsTo({ ...effective, threshold: 12 }) } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const WeightsChangedLight: Story = { globals: { theme: 'light' } }
export const ThresholdChangedLight: Story = { ...ThresholdChanged, globals: { theme: 'light' } }
