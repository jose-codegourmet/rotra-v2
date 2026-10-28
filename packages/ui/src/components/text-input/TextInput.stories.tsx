import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextInput } from './TextInput'

const meta = {
  title: 'Shared/Fields/TextInput',
  component: TextInput,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: { 'aria-label': 'Player name', placeholder: 'Full name' },
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Filled: Story = { args: { defaultValue: 'Miguel Santos' } }
export const Invalid: Story = { args: { invalid: true, defaultValue: '09' } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Miguel Santos' } }

export const InField: Story = {
  render: () => (
    <Field label="Username" hint="Your club account username, not a player phone or email.">
      <TextInput autoComplete="username" />
    </Field>
  ),
}

export const LongValue: Story = {
  args: {
    defaultValue:
      'RTR-PH-CEB-031526-0001 · Miguel Santos (Migs), a long value that must not push the layout sideways',
  },
  globals: { viewport: { value: 'phone' } },
}

export const PasswordVisibility: Story = {
  args: {
    type: 'password',
    passwordVisibility: true,
    'aria-label': 'Password',
    placeholder: undefined,
  },
}
