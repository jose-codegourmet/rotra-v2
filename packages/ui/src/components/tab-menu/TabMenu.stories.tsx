import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { userEvent, within } from 'storybook/test'
import { TabMenu } from './TabMenu'

const items = [
  { value: 'overview', label: 'Overview' },
  { value: 'roster', label: 'Roster and levels', badges: [{ text: '14/24' }] },
  { value: 'waitlist', label: 'Waitlist', badges: [{ text: '2' }] },
  { value: 'payments', label: 'Payments', badges: [{ text: '8/14 paid' }] },
]

function Example() {
  const [value, setValue] = useState('roster')
  return <TabMenu items={items} value={value} onChange={setValue} aria-label="Preparation section" />
}

const meta = {
  title: 'Shared/TabMenu',
  component: TabMenu,
  args: { items, value: 'roster', onChange: () => {}, 'aria-label': 'Preparation section' },
} satisfies Meta<typeof TabMenu>
export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = { render: () => <Example />, globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { ...Phone, globals: { viewport: { value: 'phone' }, theme: 'light' } }
export const Open: Story = {
  ...Phone,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Preparation section: Roster and levels' }))
  },
}
export const OpenLight: Story = {
  ...Open,
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const Disabled: Story = {
  args: { items: [...items, { value: 'disabled', label: 'Unavailable', disabled: true }] },
}
