import type { Meta, StoryObj } from '@storybook/react-vite'
import { PixelFire } from './PixelFire'

const meta = {
  title: 'Player/TopThreePodium/PixelFire',
  component: PixelFire,
  decorators: [
    (Story) => (
      <div className="relative h-40 bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PixelFire>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
