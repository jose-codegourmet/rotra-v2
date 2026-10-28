import { financialEstimateVariants } from '@rotra/data/fixtures/financials'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CostEstimateSummary } from './CostEstimateSummary'

const meta = { title: 'Queue/CostEstimateSummary', component: CostEstimateSummary, args: { estimate: financialEstimateVariants.profit } } satisfies Meta<typeof CostEstimateSummary>
export default meta
type Story = StoryObj<typeof meta>
export const Profit: Story = {}
export const Loss: Story = { args: { estimate: financialEstimateVariants.loss } }
export const BreaksEven: Story = { args: { estimate: financialEstimateVariants.breaksEven } }
export const RoundingSurplus: Story = { args: { estimate: financialEstimateVariants.roundingSurplus } }
export const NoCosts: Story = { args: { estimate: financialEstimateVariants.noCosts } }
