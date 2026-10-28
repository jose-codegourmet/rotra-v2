import { signInExamples } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { PhoneOrEmailInput, type PhoneOrEmailInputProps } from './PhoneOrEmailInput'
import { formatIdentifier } from './PhoneOrEmailInput.helpers'

function Demo(args: PhoneOrEmailInputProps) {
  const [value, setValue] = useState(args.value)
  return <PhoneOrEmailInput {...args} value={value} onChange={setValue} />
}
const meta = {
  title: 'Shared/PhoneOrEmailInput',
  component: PhoneOrEmailInput,
  render: Demo,
  args: { value: '', onChange: () => {}, 'aria-label': 'Phone number or email' },
} satisfies Meta<typeof PhoneOrEmailInput>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const LocalPhone: Story = {
  args: { value: formatIdentifier(signInExamples.phone, 'phone-or-email') },
}
export const InternationalPhone: Story = { args: { value: signInExamples.international } }
export const Email: Story = { args: { value: signInExamples.email } }
export const PhoneMode: Story = { args: { mode: 'phone', value: signInExamples.international } }
