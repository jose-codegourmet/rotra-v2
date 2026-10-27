import { Button } from '@rotra/ui/button'
import { addDays, todayYmd, toYmd } from '@rotra/ui/date-picker/date-calendar/helpers'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { ChooseDateSheet, type ChooseDateSheetProps } from './ChooseDateSheet'

const today = todayYmd()
const inDays = (n: number) => toYmd(addDays(new Date(), n))

function Demo(props: Partial<ChooseDateSheetProps>) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState(props.value ?? inDays(1))
  return (
    <>
      <Button onClick={() => setOpen(true)}>Date: {value}</Button>
      <ChooseDateSheet
        markedDates={[today, inDays(3), inDays(10)]}
        {...props}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onApply={(ymd) => {
          setValue(ymd)
          setOpen(false)
        }}
      />
    </>
  )
}

const meta = {
  title: 'Queue/ChooseDateSheet',
  component: ChooseDateSheet,
  args: { open: true, onOpenChange: fn(), value: today, onApply: fn() },
} satisfies Meta<typeof ChooseDateSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Today: Story = { render: () => <Demo value={today} /> }
export const MarkedDays: Story = { render: () => <Demo /> }
export const PastSavedDate: Story = {
  render: () => <Demo value={inDays(-3)} allowedPastDate={inDays(-3)} />,
}
export const Phone: Story = {
  render: () => <Demo />,
  globals: { viewport: { value: 'phone' } },
}
