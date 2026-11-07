import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ExperienceFields, type ExperienceValue } from './ExperienceFields'

const now = new Date(2026, 10, 8)
function Controlled(props: { initial: ExperienceValue; yearsError?: string; disabled?: boolean }) {
  const [value, setValue] = useState(props.initial)
  return (
    <ExperienceFields
      value={value}
      onChange={setValue}
      now={now}
      yearsError={props.yearsError}
      disabled={props.disabled}
    />
  )
}
const meta = {
  title: 'Player/ExperienceFields',
  component: Controlled,
  args: { initial: { years: '', months: '' } },
} satisfies Meta<typeof Controlled>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Filled: Story = { args: { initial: { years: '4', months: '6' } } }
export const YearsError: Story = {
  args: { initial: { years: '99', months: '' }, yearsError: 'Enter whole years from 0 to 80.' },
}
export const Disabled: Story = { args: { initial: { years: '2', months: '0' }, disabled: true } }
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
