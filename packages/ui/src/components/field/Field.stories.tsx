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
    error: 'Enter the court fee, or 0 if courts are free.',
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
      'Shuttlecock cost per tube, including delivery from the supplier in Tagbilaran City and any bulk discount',
    hint: 'Used only for the operator-only cost estimate. Never shown to players.',
    optional: true,
    children: <TextInput inputMode="numeric" />,
  },
  globals: { viewport: { value: 'phone' } },
}
