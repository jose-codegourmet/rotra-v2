import type { Meta, StoryObj } from '@storybook/react-vite'
import { SheetSteps } from './SheetSteps'

const meta = {
  title: 'Admin/SheetSteps',
  component: SheetSteps,
  args: { steps: ['Details', 'Review'], current: 0 },
} satisfies Meta<typeof SheetSteps>

export default meta
type Story = StoryObj<typeof meta>

export const Details: Story = {}
export const Review: Story = { args: { current: 1 } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const DetailsLight: Story = { globals: { theme: 'light' } }
export const ReviewLight: Story = { ...Review, globals: { theme: 'light' } }
