import type { Meta, StoryObj } from '@storybook/react-vite'
import { UploadProgress } from './UploadProgress'

const meta = {
  title: 'Admin/UploadProgress',
  component: UploadProgress,
  args: { done: 1, total: 3 },
  decorators: [(Story) => <div className="max-w-xl">{Story()}</div>],
} satisfies Meta<typeof UploadProgress>
export default meta
type Story = StoryObj<typeof meta>

export const Started: Story = { args: { done: 0, total: 3 } }
export const Midway: Story = {}
export const MidwayLight: Story = { globals: { theme: 'light' } }
export const AlmostDone: Story = { args: { done: 2, total: 3 } }
