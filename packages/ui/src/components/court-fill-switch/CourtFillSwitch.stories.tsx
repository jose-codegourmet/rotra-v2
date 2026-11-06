import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CourtFillSwitch } from './CourtFillSwitch'

const meta = {
  title: 'Queue/CourtFillSwitch',
  component: CourtFillSwitch,
  args: { value: 'manual', onChange: fn() },
} satisfies Meta<typeof CourtFillSwitch>

export default meta
type Story = StoryObj<typeof meta>

/** The default for every session */
export const Manual: Story = {}
export const Auto: Story = { args: { value: 'auto' } }

/** Switch between the two; the helper line follows */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <CourtFillSwitch
        {...args}
        value={value}
        onChange={(mode) => {
          setValue(mode)
          args.onChange(mode)
        }}
      />
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Auto Queue' }))
    await expect(args.onChange).toHaveBeenCalledWith('auto')
    await expect(
      canvas.getByText('Free courts get the next ready match. You still start each one.'),
    ).toBeVisible()
  },
}

export const ManualLight: Story = { ...Manual, globals: { theme: 'light' } }
export const AutoLight: Story = { ...Auto, globals: { theme: 'light' } }
export const Phone: Story = { ...Auto, globals: { viewport: { value: 'phone' } } }
