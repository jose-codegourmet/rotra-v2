import { Button } from '@rotra/ui/button'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ConfirmSheet, type ConfirmSheetProps } from './ConfirmSheet'

// D-INVALID-MATCH copy from docs/screens/product/dialogs.md
const INVALID = {
  title: 'Mark match invalid?',
  consequence:
    'No game, win, loss, or minimum-game credit will be recorded. This decision cannot be changed.',
  confirmLabel: 'Confirm invalid match',
  backLabel: 'Keep playing',
  destructive: true,
  summary: (
    <KeyValueList
      items={[
        { label: 'Match', value: 'Match 3 · Court 2' },
        { label: 'Team A', value: 'Jose and Aaron' },
        { label: 'Team B', value: 'Raymark and Mikee Abellana' },
      ]}
    />
  ),
}

function Demo(props: Partial<ConfirmSheetProps> & { failFirst?: boolean }) {
  const [open, setOpen] = useState(props.open ?? true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [commits, setCommits] = useState(0)
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={() => setOpen(true)}>Open</Button>
      <p className="text-[13px] text-fg2">Commits fired: {commits}</p>
      <ConfirmSheet
        {...INVALID}
        {...props}
        open={open}
        onOpenChange={setOpen}
        isPending={pending}
        error={error}
        onConfirm={() => {
          setCommits((n) => n + 1)
          setError(undefined)
          setPending(true)
          setTimeout(() => {
            setPending(false)
            if (props.failFirst && !failed) {
              setFailed(true)
              setError("You're offline, so nothing was saved. Try again once you're connected.")
            } else setOpen(false)
          }, 1200)
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Shared/ConfirmSheet',
  component: ConfirmSheet,
  args: { ...INVALID, open: true, onOpenChange: () => {}, onConfirm: () => {} },
} satisfies Meta<typeof ConfirmSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Destructive: Story = { render: () => <Demo /> }

export const Primary: Story = {
  render: () => (
    <Demo
      title="Confirm match result"
      consequence="This result cannot be changed after confirmation. The court will become available."
      confirmLabel="Team A won"
      backLabel="Back to result"
      destructive={false}
    />
  ),
}

export const Pending: Story = { args: { isPending: true } }

export const FailsOnce: Story = { render: () => <Demo failFirst /> }

export const Phone: Story = { render: () => <Demo />, globals: { viewport: { value: 'phone' } } }
