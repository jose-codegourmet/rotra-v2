import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CourtFillInfoSheet, type CourtFillInfoSheetProps } from './CourtFillInfoSheet'

function Demo(props: CourtFillInfoSheetProps) {
  const [open, setOpen] = useState(props.open)
  return (
    <>
      <Button onClick={() => setOpen(true)}>How Auto Queue works</Button>
      <CourtFillInfoSheet {...props} open={open} onOpenChange={setOpen} />
    </>
  )
}

const meta = {
  title: 'Queue/CourtFillInfoSheet',
  component: CourtFillInfoSheet,
  args: { open: true, onOpenChange: fn(), mode: 'manual', onSwitch: fn() },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof CourtFillInfoSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Switch off: the Manual Queue card is On now, the button turns Auto Queue on */
export const ManualOn: Story = {}
/** Switch on: the Auto Queue card is On now, the button switches back */
export const AutoOn: Story = { args: { mode: 'auto' } }
export const ManualOnLight: Story = { globals: { theme: 'light' } }
export const AutoOnLight: Story = { args: { mode: 'auto' }, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneAuto: Story = {
  args: { mode: 'auto' },
  globals: { viewport: { value: 'phone' } },
}
export const Saving: Story = { args: { busy: true } }

export const SwitchButton: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.click(await dialog.findByRole('button', { name: 'Turn on Auto Queue' }))
    await expect(args.onSwitch).toHaveBeenCalledWith('auto')
  },
}
