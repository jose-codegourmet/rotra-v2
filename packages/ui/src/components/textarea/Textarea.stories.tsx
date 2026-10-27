import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './Textarea'

const meta = {
  title: 'Shared/Fields/Textarea',
  component: Textarea,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { 'aria-label': 'Club description', rows: 4 },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { placeholder: 'One or two lines about your club' } }
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Friendly open play.' } }

export const InField: Story = {
  render: () => (
    <Field label="Club description" hint="Up to 300 characters." optional>
      <Textarea rows={4} maxLength={300} placeholder="One or two lines about your club" />
    </Field>
  ),
}
