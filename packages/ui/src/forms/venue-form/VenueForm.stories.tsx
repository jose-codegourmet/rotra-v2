import { venues } from '@rotra/data/fixtures/venues'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { VenueForm } from './VenueForm'
import { feeToInput } from './VenueForm.defaultValues'

const talamban = venues[1]
if (!talamban) throw new Error('Venue fixtures missing')
const names = venues.map((v) => v.name)

const meta = {
  title: 'Queue/VenueForm',
  component: VenueForm,
  args: {
    open: true,
    onOpenChange: fn(),
    mode: 'new',
    onSubmit: fn(),
    existingNames: names,
  },
} satisfies Meta<typeof VenueForm>

export default meta
type Story = StoryObj<typeof meta>

export const New: Story = {}

export const Edit: Story = {
  args: {
    mode: 'edit',
    existingNames: names.filter((n) => n !== talamban.name),
    defaultValues: {
      name: talamban.name,
      address: talamban.address,
      courtFee: feeToInput(talamban.courtFeeMinor),
      entranceFee: feeToInput(talamban.entranceFeeMinor),
    },
  },
}

/** Submit with an empty name and a negative fee to see the field errors. */
export const ValidationErrors: Story = {
  args: { defaultValues: { courtFee: '-50' } },
  // The sheet is portaled to <body>, outside the story root.
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'Save venue' }))
  },
}

export const DuplicateName: Story = {
  args: { defaultValues: { name: 'banilad sports hub' } },
  // The sheet is portaled to <body>, outside the story root.
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'Save venue' }))
  },
}

export const Pending: Story = {
  args: { isPending: true, defaultValues: { name: talamban.name } },
}

export const FromPicker: Story = { args: { cancelLabel: 'Back' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
