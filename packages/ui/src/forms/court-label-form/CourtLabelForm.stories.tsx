import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { CourtLabelForm } from './CourtLabelForm'

const meta = {
  title: 'Queue/CourtLabelForm',
  component: CourtLabelForm,
  args: {
    open: true,
    onOpenChange: fn(),
    currentLabel: 'Court 1',
    otherLabels: ['Court 2', 'Court 3'],
    onSubmit: fn(),
  },
} satisfies Meta<typeof CourtLabelForm>

export default meta
type Story = StoryObj<typeof meta>

// The sheet is portaled to <body>, outside the story root.
const typeAndSave =
  (text: string): Story['play'] =>
  async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    const input = await body.findByRole('textbox', { name: /Court label/ })
    await userEvent.clear(input)
    if (text) await userEvent.type(input, text)
    await userEvent.click(await body.findByRole('button', { name: 'Save label' }))
  }

/** Prefilled with the current label; the hint says where it shows. */
export const Default: Story = {}
export const Empty: Story = { play: typeAndSave('') }
export const Duplicate: Story = { play: typeAndSave('court 2') }
export const Saving: Story = { args: { isPending: true } }
export const ServerError: Story = { args: { serverError: 'Court no longer available.' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
