import type { Meta, StoryObj } from '@storybook/react-vite'
import { WeightSplitBar } from './WeightSplitBar'

const meta = { title: 'Player/WeightSplitBar', component: WeightSplitBar } satisfies Meta<
  typeof WeightSplitBar
>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: { assessmentWeightPercent: 70 } }
export const Changed: Story = { args: { assessmentWeightPercent: 60 } }
export const AssessmentOnly: Story = { args: { assessmentWeightPercent: 100 } }
export const PerformanceOnly: Story = { args: { assessmentWeightPercent: 0 } }
