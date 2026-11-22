import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TransferLinkSheet } from './TransferLinkSheet'

const meta = {
  title: 'Queue/TransferLinkSheet',
  component: TransferLinkSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    link: 'https://rotra.app/s/tonight?transfer=Rotra-demo-transfer-link-for-tonight-0001xy',
    startsLabel: 'Nov 9, 7:30 PM',
    onCopy: fn(),
  },
} satisfies Meta<typeof TransferLinkSheet>
export default meta
type Story = StoryObj<typeof meta>

/** No system share sheet: the footer offers Copy link */
export const CopyOnly: Story = {}
/** A phone with the system share sheet */
export const WithShare: Story = { args: { onShare: fn() } }
/** The QR encoder failed: the copy field still works */
export const QrUnavailable: Story = { args: { draw: () => null } }
export const CopyOnlyLight: Story = { globals: { theme: 'light' } }
export const WithShareLight: Story = { ...WithShare, globals: { theme: 'light' } }
