import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleButton } from './GoogleButton'

const meta = {
  title: 'Player/GoogleButton',
  component: GoogleButton,
  args: { onClick: () => {} },
  decorators: [
    (Story) => (
      <div className="w-[min(420px,100%)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GoogleButton>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { pending: true } }
export const Disabled: Story = { args: { disabled: true } }
export const ConnectLabel: Story = { args: { label: 'Connect Google' } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const PendingLight: Story = { args: { pending: true }, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
