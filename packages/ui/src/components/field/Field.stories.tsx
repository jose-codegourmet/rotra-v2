import { TextInput } from '@rotra/ui/text-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field } from './Field'

const meta = {
  title: 'Shared/Fields/Field',
  component: Field,
  args: { label: 'Username', children: <TextInput autoComplete="username" /> },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithHint: Story = {
  args: { hint: 'Your club account username, not a player phone or email.' },
}

export const WithError: Story = {
  args: {
    label: 'Court fee per hour, per court',
    error: 'Use 0 or more, or leave it empty.',
    children: <TextInput inputMode="numeric" defaultValue="-50" />,
  },
}

export const Optional: Story = {
  args: {
    label: 'Entrance fee per head',
    optional: true,
    children: <TextInput inputMode="numeric" />,
  },
}

export const Disabled: Story = {
  args: { children: <TextInput disabled defaultValue="tagbilaran-bc" /> },
}

export const LongLabel: Story = {
  args: {
    label:
      'A deliberately long label that has to wrap onto a second line on a 375 px phone without overflowing',
    optional: true,
    children: <TextInput inputMode="numeric" />,
  },
  globals: { viewport: { value: 'phone' } },
}
