import { decidedJoinRequests, joinRequests } from '@rotra/data/fixtures/joinRequests'
import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { JoinRequestsPanel } from './JoinRequestsPanel'

const history = decidedJoinRequests.filter((r) => r.status !== 'pending')

const meta = {
  title: 'Queue/JoinRequestsPanel',
  component: JoinRequestsPanel,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  args: { requests: joinRequests, onConfirm: fn(), onDecline: fn() },
} satisfies Meta<typeof JoinRequestsPanel>

export default meta
type Story = StoryObj<typeof meta>

/** The prototype's four sample guests: Rico Santos, Mae Lagman, JP Uy, Tessa Ramos. */
export const FourGuests: Story = {}
export const SlotsFull: Story = { args: { slotsFull: true } }
/** Tessa said "Not sure", so her level is empty; Confirm guest shows the error. */
export const LevelError: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm guest Tessa Ramos' }))
  },
}
export const EmptyWithHistory: Story = { args: { requests: history } }
export const EmptyNoHistory: Story = { args: { requests: [] } }
/** Requests still loading: Skeleton rows, never fake names. */
export const Loading: Story = { args: { requests: [], loading: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

function SheetDemo({ slotsFull, loading }: { slotsFull?: boolean; loading?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Join requests · {joinRequests.length}</Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Join requests"
        wide
        footer={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        <JoinRequestsPanel
          variant="sheet"
          loading={loading}
          requests={joinRequests}
          slotsFull={slotsFull}
          onConfirm={fn()}
          onDecline={fn()}
        />
      </Sheet>
    </>
  )
}

/** The live console's Join requests sheet: same list, no card chrome, the sheet title names it. */
export const InSheet: Story = { render: () => <SheetDemo /> }
export const InSheetLoading: Story = { render: () => <SheetDemo loading /> }
export const InSheetPhone: Story = {
  render: () => <SheetDemo slotsFull />,
  globals: { viewport: { value: 'phone' } },
}
