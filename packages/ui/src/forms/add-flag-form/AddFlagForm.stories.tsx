import { placeholderFeatureFlag } from '@rotra/data/fixtures/feature-flags'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AddFlagForm } from './AddFlagForm'
import type { AddFlagFormInput } from './AddFlagForm.schema'

/** The dev-only placeholder flag as typed into the form. */
const filled: Partial<AddFlagFormInput> = {
  name: placeholderFeatureFlag.name,
  key: placeholderFeatureFlag.key,
  description: placeholderFeatureFlag.description,
  on: placeholderFeatureFlag.on,
}

const meta = {
  title: 'Admin/AddFlagForm',
  component: AddFlagForm,
  args: {
    // The catalog starts empty, so nothing is taken.
    takenNames: [],
    takenKeys: [],
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddFlagForm>

export default meta
type Story = StoryObj<typeof meta>

const addFlag: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Add flag' }))
}

export const Empty: Story = {}
/** Typing the name fills the key: accents dropped, lowercase, underscores ("placeholder_flag"). */
export const Suggested: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Plácehölder flag')
  },
}
/** Once the key is edited by hand, it stops following the name. */
export const KeyEdited: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Placeholder')
    const key = canvas.getByLabelText('Key')
    await userEvent.clear(key)
    await userEvent.type(key, 'placeholder')
    await userEvent.type(canvas.getByLabelText('Name'), ' flag')
  },
}
export const Filled: Story = { args: { defaultValues: filled } }
/** Add flag with nothing filled in: every required message. */
export const Errors: Story = { play: addFlag }
/** A name over 50 characters, a key with capitals and a space, a description under 10 characters. */
export const InvalidValues: Story = {
  args: {
    defaultValues: {
      name: `${placeholderFeatureFlag.name} that shows how a defined flag will look`,
      key: 'Placeholder flag',
      description: 'Nothing.',
    },
  },
  play: addFlag,
}
/** The name matches ignoring case and accents, and the key is already used. */
export const Taken: Story = {
  args: {
    defaultValues: { ...filled, name: 'Plácehölder FLAG' },
    takenNames: [placeholderFeatureFlag.name],
    takenKeys: [placeholderFeatureFlag.key],
  },
  play: addFlag,
}
export const TurnOnRightAway: Story = { args: { defaultValues: { ...filled, on: true } } }
export const Pending: Story = { args: { defaultValues: filled, isPending: true } }
export const ServerError: Story = {
  args: {
    defaultValues: filled,
    serverError: "You're offline, so nothing was saved. Try again once you're connected.",
  },
}
export const Phone: Story = {
  args: { defaultValues: filled },
  globals: { viewport: { value: 'phone' } },
}
export const PhoneErrors: Story = { ...Errors, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = {
  args: { defaultValues: filled },
  globals: { viewport: { value: 'desktop' } },
}
export const EmptyLight: Story = { globals: { theme: 'light' } }
export const SuggestedLight: Story = { ...Suggested, globals: { theme: 'light' } }
export const ErrorsLight: Story = { ...Errors, globals: { theme: 'light' } }
export const PendingLight: Story = { ...Pending, globals: { theme: 'light' } }
export const ServerErrorLight: Story = { ...ServerError, globals: { theme: 'light' } }
