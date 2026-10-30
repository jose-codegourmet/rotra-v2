import { rankingPolicyVersion1 } from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { WeightSplitBar } from './WeightSplitBar'

const meta = {
  title: 'Admin/WeightSplitBar',
  component: WeightSplitBar,
  args: {
    assessment: rankingPolicyVersion1.assessmentWeightBp / 100,
    performance: rankingPolicyVersion1.performanceWeightBp / 100,
  },
} satisfies Meta<typeof WeightSplitBar>

export default meta
type Story = StoryObj<typeof meta>

/** Version 1: 70% assessment, 30% performance. */
export const Default: Story = {}
export const Uneven: Story = { args: { assessment: 85, performance: 15 } }
/** 70 / 40 adds up to 110%, so no segments are drawn. */
export const InvalidTotal: Story = { args: { assessment: 70, performance: 40 } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const UnevenLight: Story = { ...Uneven, globals: { theme: 'light' } }
