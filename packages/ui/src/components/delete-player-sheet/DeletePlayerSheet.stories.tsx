import type { Meta, StoryObj } from '@storybook/react-vite'
import { DeletePlayerSheet } from './DeletePlayerSheet'

const meta = {
  title: 'Queue/DeletePlayerSheet',
  component: DeletePlayerSheet,
  args: {
    open: true,
    onOpenChange: () => {},
    onConfirm: () => {},
    name: 'Jarius Dela Peña',
    shortName: 'Jarius',
    sessionTitle: 'Thursday Night Doubles',
    waitingMatches: 2,
    busy: false,
  },
} satisfies Meta<typeof DeletePlayerSheet>
export default meta
type Story = StoryObj<typeof meta>
export const InActiveSession: Story = {}
export const NoWaitingMatches: Story = { args: { waitingMatches: 0 } }
export const OnCourt: Story = { args: { busy: true } }
export const Pending: Story = { args: { isPending: true } }
export const Refused: Story = {
  args: { error: 'Jarius is on court. Finish or substitute that match first.' },
}
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
