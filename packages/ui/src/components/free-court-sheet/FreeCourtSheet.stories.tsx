import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FreeCourtSheet } from './FreeCourtSheet'

const meta = {
  title: 'Queue/FreeCourtSheet',
  component: FreeCourtSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    courtLabel: 'Court 2',
    waitingCount: 4,
    onPick: fn(),
    onGenerate: fn(),
  },
} satisfies Meta<typeof FreeCourtSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OneWaiting: Story = { args: { waitingCount: 1 } }
/** Pick from the queue is disabled and says "The Main Queue is empty." */
export const EmptyQueue: Story = { args: { waitingCount: 0 } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
export const DesktopLight: Story = { globals: { viewport: { value: 'desktop' }, theme: 'light' } }
