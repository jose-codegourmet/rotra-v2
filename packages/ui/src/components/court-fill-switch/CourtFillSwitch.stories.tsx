import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { QueueViewSwitch } from '../queue-grid/queue-view-switch/QueueViewSwitch'
import { CourtFillSwitch } from './CourtFillSwitch'

const meta = {
  title: 'Queue/CourtFillSwitch',
  component: CourtFillSwitch,
  args: { value: 'manual', onChange: fn(), onOpenInfo: fn() },
} satisfies Meta<typeof CourtFillSwitch>

export default meta
type Story = StoryObj<typeof meta>

/** The default for every session: switch off */
export const Off: Story = {}
export const On: Story = { args: { value: 'auto' } }

/** With the Court layout switch on the right of the row */
export const WithCourtLayout: Story = {
  args: {
    trailing: (
      <QueueViewSwitch
        value="grid"
        onChange={fn()}
        label="Court layout"
        gridFirst
        slideIcon="list"
      />
    ),
  },
}

/** Switch it; the helper line follows, the ⓘ asks to open the dialog */
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
    await userEvent.click(canvas.getByRole('switch', { name: 'Auto Queue' }))
    await expect(args.onChange).toHaveBeenCalledWith('auto')
    await expect(
      canvas.getByText('Free courts get the next ready match. You still start each one.'),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'How Auto Queue works' }))
    await expect(args.onOpenInfo).toHaveBeenCalled()
  },
}

export const OffLight: Story = { ...Off, globals: { theme: 'light' } }
export const OnLight: Story = { ...On, globals: { theme: 'light' } }
export const Phone: Story = { ...WithCourtLayout, globals: { viewport: { value: 'phone' } } }
