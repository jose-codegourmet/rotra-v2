import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Sheet, type SheetProps } from './Sheet'

function SheetDemo(props: Partial<SheetProps>) {
  const [open, setOpen] = useState(props.open ?? false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open sheet</Button>
      <Sheet
        title="Add a venue"
        {...props}
        open={open}
        onOpenChange={setOpen}
        footer={
          props.footer ?? (
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Save venue
              </Button>
            </>
          )
        }
      >
        {props.children ?? (
          <>
            <Field label="Venue name">
              <TextInput defaultValue="Banilad Sports Hub" />
            </Field>
            <Field label="Address" optional>
              <TextInput defaultValue="Gov. M. Cuenco Ave, Banilad, Cebu City" />
            </Field>
          </>
        )}
      </Sheet>
    </>
  )
}

const meta = {
  title: 'Shared/Sheet',
  component: Sheet,
  args: { open: false, onOpenChange: () => {}, title: 'Add a venue' },
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { render: () => <SheetDemo /> }
export const OpenOnLoad: Story = { render: () => <SheetDemo open /> }
export const Wide: Story = { render: () => <SheetDemo open wide title="Session record" /> }
export const Phone: Story = {
  render: () => <SheetDemo open />,
  globals: { viewport: { value: 'phone' } },
}

export const LongBody: Story = {
  render: () => (
    <SheetDemo open title="Long content">
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Line {i + 1} of a long body that scrolls inside the sheet.</p>
      ))}
    </SheetDemo>
  ),
}
