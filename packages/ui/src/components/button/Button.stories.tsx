import { Icon } from '@rotra/ui/icon'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: { children: 'Start match' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['secondary', 'primary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['md', 'sm', 'xs'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { variant: 'primary' } }
export const Secondary: Story = { args: { children: 'Edit lineup' } }
export const Ghost: Story = { args: { variant: 'ghost', children: 'Back' } }
export const Danger: Story = { args: { variant: 'danger', children: 'Mark match invalid' } }

export const AllVariantsAndSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['md', 'sm', 'xs'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-2">
          <Button size={size} variant="primary">
            Start match
          </Button>
          <Button size={size}>Edit lineup</Button>
          <Button size={size} variant="ghost">
            Back
          </Button>
          <Button size={size} variant="danger">
            Remove player
          </Button>
          <Button size={size} variant="primary">
            <Icon name="plus" size={16} />
            Add match
          </Button>
        </div>
      ))}
    </div>
  ),
}

export const Pressed: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" aria-pressed="true">
        Doubles
      </Button>
      <Button size="sm" aria-pressed="false">
        Singles
      </Button>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" disabled>
        Start session
      </Button>
      <Button disabled>Edit lineup</Button>
      <Button variant="danger" disabled>
        Remove player
      </Button>
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" loading>
        Confirm result
      </Button>
      <Button loading>Saving</Button>
    </div>
  ),
}

export const Block: Story = {
  args: { variant: 'primary', block: true, children: 'Sign in' },
  globals: { viewport: { value: 'phone' } },
}

export const AsLink: Story = {
  render: () => (
    <Button asChild variant="ghost" size="sm">
      <a href="#session">Open session page</a>
    </Button>
  ),
}

export const LongLabel: Story = {
  args: { children: 'Save on this device and wait to sync when the connection returns' },
  globals: { viewport: { value: 'phone' } },
}

export const Phone: Story = {
  render: AllVariantsAndSizes.render,
  globals: { viewport: { value: 'phone' } },
}
