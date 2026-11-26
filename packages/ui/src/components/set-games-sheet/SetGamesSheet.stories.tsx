import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { SetGamesSheet } from './SetGamesSheet'

const meta = {
  title: 'Queue/SetGamesSheet',
  component: SetGamesSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    target: { kind: 'one', name: 'Migs Alcantara', current: 3 },
  },
} satisfies Meta<typeof SetGamesSheet>

export default meta
type Story = StoryObj<typeof meta>

export const OnePlayer: Story = {}
export const EveryPlayer: Story = {
  args: { target: { kind: 'all', count: 14, median: 2 } },
}
/** One game more: the To side turns accent and reads "+1 game" */
export const Changed: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'One game more' }))
  },
}
export const EveryPlayerRange: Story = {
  args: { target: { kind: 'all', count: 14, median: 3, range: { min: 2, max: 4 } } },
}
export const AtZero: Story = {
  args: { target: { kind: 'one', name: 'Migs Alcantara', current: 0 } },
}
export const Pending: Story = { args: { isPending: true } }
export const Failed: Story = {
  args: { error: 'Could not save. Check your connection and try again.' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
