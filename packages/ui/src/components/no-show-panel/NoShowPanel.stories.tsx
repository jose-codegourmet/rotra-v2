import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NoShowPanel } from './NoShowPanel'

const meta = {
  title: 'Queue/NoShowPanel',
  component: NoShowPanel,
  args: {
    entries: [
      { id: 'r1', name: 'Mikee Abellana', markedLabel: '7:42 PM' },
      { id: 'r2', name: 'Dexter Ramos', markedLabel: '8:05 PM' },
    ],
    full: false,
    onBackToRoster: fn(),
    onOpenProfile: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[720px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NoShowPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** Every slot is taken: Back to roster is disabled */
export const RosterFull: Story = { args: { full: true } }
export const Saving: Story = { args: { isPending: true } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
