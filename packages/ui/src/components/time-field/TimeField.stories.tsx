import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TimeField } from './TimeField'

const meta = {
  title: 'Shared/Fields/TimeField',
  component: TimeField,
  decorators: [
    (Story) => (
      <div className="max-w-[220px]">
        <Story />
      </div>
    ),
  ],
  args: { 'aria-label': 'Starts', defaultValue: '18:00' },
} satisfies Meta<typeof TimeField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true } }

export const StartsAndEnds: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3.5">
      <Field label="Starts">
        <TimeField defaultValue="20:00" />
      </Field>
      <Field label="Ends" hint="Ends the next day · 4h">
        <TimeField defaultValue="00:00" />
      </Field>
    </div>
  ),
}
