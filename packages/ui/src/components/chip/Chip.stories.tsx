import type { Meta, StoryObj } from '@storybook/react-vite'
import { Chip } from './Chip'

const meta = {
  title: 'Shared/Chip',
  component: Chip,
  args: { children: 'Registered', tone: 'accent' },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'accent', 'warn', 'error', 'solid', 'live'],
    },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip>Guest</Chip>
      <Chip tone="accent">Registered</Chip>
      <Chip tone="warn">Lookup pending</Chip>
      <Chip tone="error">Invalid</Chip>
      <Chip tone="solid">Min 4 games</Chip>
      <Chip tone="live">Live</Chip>
    </div>
  ),
}

export const Live: Story = { args: { tone: 'live', children: 'Live' } }

export const LongText: Story = {
  args: { tone: 'warn', children: 'Saved on this device · waiting to sync' },
  globals: { viewport: { value: 'phone' } },
}
