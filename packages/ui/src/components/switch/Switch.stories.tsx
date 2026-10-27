import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Switch } from './Switch'

const meta = {
  title: 'Shared/Fields/Switch',
  component: Switch,
  args: { 'aria-label': 'Present: Migs Santos' },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return <Switch {...args} checked={checked} onChange={setChecked} />
  },
}

export const On: Story = { args: { checked: true } }
export const Off: Story = { args: { checked: false } }
export const Disabled: Story = { args: { checked: true, disabled: true } }

export const WithLabel: Story = {
  render: () => {
    const [checked, setChecked] = useState(true)
    return (
      <div className="flex max-w-sm items-center justify-between gap-4">
        <span>
          <b>Doubles</b>
          <span className="block text-[13px] text-fg2">Four players per match</span>
        </span>
        <Switch aria-label="Doubles" checked={checked} onChange={setChecked} />
      </div>
    )
  },
}
