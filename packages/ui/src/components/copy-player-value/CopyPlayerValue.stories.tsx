import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyPlayerValue } from './CopyPlayerValue'

const meta = {
  title: 'Admin/CopyPlayerValue',
  component: CopyPlayerValue,
  args: { value: 'RTR-PH-CEB-100126-1000', onClose: () => {} },
} satisfies Meta<typeof CopyPlayerValue>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
