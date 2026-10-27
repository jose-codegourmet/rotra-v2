import { Icon } from '@rotra/ui/icon'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from './IconButton'

const meta = {
  title: 'Shared/IconButton',
  component: IconButton,
  args: { label: 'Close', variant: 'ghost', size: 'xs', children: <Icon name="x" /> },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AllVariantsAndSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['md', 'sm', 'xs'] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          <IconButton size={size} variant="ghost" label="Open menu">
            <Icon name="menu" />
          </IconButton>
          <IconButton size={size} label="Move up">
            <Icon name="up" />
          </IconButton>
          <IconButton size={size} variant="primary" label="Add match">
            <Icon name="plus" />
          </IconButton>
          <IconButton size={size} label="Back">
            <Icon name="back" />
          </IconButton>
        </div>
      ))}
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, label: 'Move up', children: <Icon name="up" /> },
}

export const Loading: Story = { args: { loading: true, label: 'Saving', children: null } }

export const Phone: Story = {
  render: AllVariantsAndSizes.render,
  globals: { viewport: { value: 'phone' } },
}
