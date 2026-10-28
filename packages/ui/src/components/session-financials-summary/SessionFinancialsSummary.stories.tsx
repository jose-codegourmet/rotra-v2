import {
  financialShuttleLines,
  sundayEstimate,
  thursdayEstimate,
} from '@rotra/data/fixtures/financials'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionFinancialsSummary } from './SessionFinancialsSummary'

const meta = {
  title: 'Queue/SessionFinancialsSummary',
  component: SessionFinancialsSummary,
  args: {
    estimate: thursdayEstimate,
    courts: 3,
    durationLabel: '3h',
    courtFeePerCourtHour: 35000,
    shuttleLines: financialShuttleLines,
  },
} satisfies Meta<typeof SessionFinancialsSummary>
export default meta
type Story = StoryObj<typeof meta>
export const ThursdayOpenPlay: Story = {}
export const SundayNightQueue: Story = {
  args: { estimate: sundayEstimate, shuttleLines: [{ id: 'inv1', name: 'XP2', tubes: 4 }] },
}
export const NoEstimate: Story = { args: { estimate: null } }
