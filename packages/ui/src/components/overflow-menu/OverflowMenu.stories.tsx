import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { OverflowMenu, type OverflowMenuProps } from './OverflowMenu'

const meta = {
  title: 'Shared/OverflowMenu',
  component: OverflowMenu,
  decorators: [
    (Story) => (
      <div className="flex min-h-64 justify-end p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'More for Court 4',
    items: [
      { label: 'Edit', onSelect: fn() },
      { label: 'Undo early open', onSelect: fn() },
      { label: 'Remove', onSelect: fn(), destructive: true },
    ],
  },
} satisfies Meta<OverflowMenuProps>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'More for Court 4' }))
    await expect(canvas.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
  },
}
export const WithDisabledItem: Story = {
  args: {
    items: [
      { label: 'Edit', onSelect: fn() },
      { label: 'Undo early open', onSelect: fn(), disabledReason: 'A match is on this court' },
      {
        label: 'Remove',
        onSelect: fn(),
        destructive: true,
        disabledReason: 'Only a free court can be removed',
      },
    ],
  },
  play: Open.play,
}
