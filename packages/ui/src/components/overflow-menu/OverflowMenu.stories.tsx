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
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('menuitem', { name: 'Edit' }),
    ).toHaveFocus()
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

/** The preparation header's ⋯ beside the title: icon rows, session-ending actions in red. */
export const WithIcons: Story = {
  args: {
    label: 'More for this session',
    triggerSize: 'sm',
    align: 'end',
    items: [
      { label: 'Cancel session', icon: 'ban', destructive: true, onSelect: fn() },
      { label: 'Delete session', icon: 'trash', destructive: true, onSelect: fn() },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'More for this session' }))
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('menuitem', { name: 'Cancel session' }),
    ).toHaveFocus()
  },
}

export const InsideClippedContainer: Story = {
  decorators: [
    (Story) => (
      <div className="h-14 w-72 overflow-hidden border border-border p-2">
        <Story />
      </div>
    ),
  ],
  play: Open.play,
}
export const ClippedContainerLight: Story = {
  ...InsideClippedContainer,
  globals: { theme: 'light' },
}
