import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { NoGoogleAccountSheet } from './NoGoogleAccountSheet'

function Demo() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>No Google account?</Button>
      <NoGoogleAccountSheet open={open} onOpenChange={setOpen} />
    </>
  )
}

const meta = {
  title: 'Player/NoGoogleAccountSheet',
  component: NoGoogleAccountSheet,
  args: { open: true, onOpenChange: () => {} },
  render: () => <Demo />,
} satisfies Meta<typeof NoGoogleAccountSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Open: Story = {}
export const OpenLight: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
