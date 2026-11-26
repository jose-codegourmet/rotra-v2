import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { OptionalFold } from './OptionalFold'

const meta = {
  title: 'Player/OptionalFold',
  component: OptionalFold,
  args: {
    summary: 'Nickname, experience and links, prefilled from your club',
    children: (
      <Field label="Nickname" optional>
        <TextInput />
      </Field>
    ),
  },
} satisfies Meta<typeof OptionalFold>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = { args: { defaultOpen: true } }

export const WithError: Story = {
  name: 'Error',
  args: {
    hasError: true,
    children: (
      <Field label="Nickname" optional error="Use 24 characters or fewer.">
        <TextInput defaultValue="A nickname that is far too long to be accepted here" />
      </Field>
    ),
  },
}
