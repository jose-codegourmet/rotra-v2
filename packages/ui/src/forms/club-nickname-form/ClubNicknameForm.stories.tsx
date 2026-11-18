import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { ClubNicknameForm } from './ClubNicknameForm'

const meta = {
  title: 'Queue/ClubNicknameForm',
  component: ClubNicknameForm,
  args: {
    open: true,
    onOpenChange: fn(),
    name: 'Miguel Santos',
    currentNickname: null,
    accountNickname: 'Migs',
    onSubmit: fn(),
  },
} satisfies Meta<typeof ClubNicknameForm>

export default meta
type Story = StoryObj<typeof meta>

// The sheet is portaled to <body>, outside the story root.
const typeAndSave =
  (text: string): Story['play'] =>
  async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    const input = await body.findByRole('textbox', { name: /Club nickname/ })
    await userEvent.clear(input)
    if (text) await userEvent.type(input, text)
    await userEvent.click(await body.findByRole('button', { name: 'Save nickname' }))
  }

/** No club nickname yet; the hint names their ROTRA account nickname. */
export const Empty: Story = {}
/** Prefilled with the current club nickname. */
export const Filled: Story = { args: { currentNickname: 'Kuya Migs' } }
/** No account nickname: the hint names "the name on their ROTRA account". */
export const NoAccountNickname: Story = { args: { accountNickname: null } }
/** Saving it empty removes the club nickname. */
export const SavedEmpty: Story = {
  args: { currentNickname: 'Kuya Migs' },
  play: typeAndSave(''),
}
export const Saving: Story = { args: { currentNickname: 'Kuya Migs', isPending: true } }
export const ServerError: Story = {
  args: { currentNickname: 'Kuya Migs', serverError: 'Could not save. Try again.' },
}
export const Light: Story = { args: { currentNickname: 'Kuya Migs' }, globals: { theme: 'light' } }
export const Phone: Story = {
  args: { currentNickname: 'Kuya Migs' },
  globals: { viewport: { value: 'phone' } },
}
