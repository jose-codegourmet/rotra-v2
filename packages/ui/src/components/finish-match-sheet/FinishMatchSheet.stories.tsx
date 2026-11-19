import { matchResultFixtures } from '@rotra/data/fixtures/match-results'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FinishMatchSheet } from './FinishMatchSheet'

const { doubles } = matchResultFixtures

const meta = {
  title: 'Queue/FinishMatchSheet',
  component: FinishMatchSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    matchNumber: 1,
    teamANames: doubles.teamANames,
    teamBNames: doubles.teamBNames,
    onConfirm: fn(),
  },
} satisfies Meta<typeof FinishMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Record games off: "Finish match 1?", the two teams, no winner or score */
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const Pending: Story = { args: { isPending: true } }
export const Failed: Story = {
  args: { error: "You're offline, so nothing was saved. Try again once you're connected." },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
