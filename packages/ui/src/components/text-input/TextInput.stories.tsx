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
export const Filled: Story = { args: { defaultValue: 'Migs Santos' } }
export const Invalid: Story = { args: { invalid: true, defaultValue: '09' } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Migs Santos' } }

export const InField: Story = {
  render: () => (
    <Field
      label="Mobile number"
      hint="Philippine mobile, e.g. 0917 123 4567"
      error="Enter an 11-digit mobile number."
    >
      <TextInput inputMode="tel" autoComplete="tel" defaultValue="0917 12" />
    </Field>
  ),
}

export const LongValue: Story = {
  args: { defaultValue: 'RTR-PH-CEB-031526-0001 · Maria Concepcion Villanueva-Dela Cruz' },
  globals: { viewport: { value: 'phone' } },
}
