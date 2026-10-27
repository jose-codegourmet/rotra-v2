import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressBar } from './ProgressBar'

const meta = {
  title: 'Shared/States/ProgressBar',
  component: ProgressBar,
  args: { value: 3, max: 4, 'aria-label': 'Games played: 3 of 4' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Small: Story = {
  args: { size: 'sm' },
  decorators: [
    (Story) => (
      <div className="w-[88px]">
        <Story />
      </div>
    ),
  ],
}
export const Warn: Story = { args: { tone: 'warn', value: 1 } }
export const Empty: Story = { args: { value: 0 } }
export const Full: Story = { args: { value: 4 } }
