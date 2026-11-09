import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { QueueSearchField } from './QueueSearchField'

const meta = {
  title: 'Queue/QueueSearchField',
  component: QueueSearchField,
  args: { value: '', onChange: fn(), matchCount: 0 },
} satisfies Meta<typeof QueueSearchField>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const OneMatch: Story = { args: { value: 'Mikee', matchCount: 1 } }
export const MultipleMatches: Story = { args: { value: 'Mikee', matchCount: 3 } }
export const NoMatches: Story = { args: { value: 'Unknown', matchCount: 0 } }
export const EmptyLight: Story = { globals: { theme: 'light' } }
export const OneMatchLight: Story = { ...OneMatch, globals: { theme: 'light' } }
export const MultipleMatchesLight: Story = { ...MultipleMatches, globals: { theme: 'light' } }
export const NoMatchesLight: Story = { ...NoMatches, globals: { theme: 'light' } }
