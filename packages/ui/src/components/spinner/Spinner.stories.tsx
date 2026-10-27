import type { Meta, StoryObj } from '@storybook/react-vite'
import { Spinner } from './Spinner'

const meta = {
  title: 'Shared/Spinner',
  component: Spinner,
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithStatusText: Story = {
  render: () => (
    <p className="flex items-center gap-2 text-[13px] text-fg2">
      <Spinner />
      Saving on this device
    </p>
  ),
}
