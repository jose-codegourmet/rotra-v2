import { claimLinkScenarios } from '@rotra/data/fixtures/player-accounts'
import { maskEmail } from '@rotra/data/player-account/rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClaimIdentityCheck } from './ClaimIdentityCheck'

const meta = {
  title: 'Player/ClaimIdentityCheck',
  component: ClaimIdentityCheck,
  args: {
    clubName: claimLinkScenarios.clubName,
    preview: claimLinkScenarios.preview,
    maskedEmail: maskEmail(claimLinkScenarios.preset.email),
    onConfirm: fn(),
    onReject: fn(),
  },
} satisfies Meta<typeof ClaimIdentityCheck>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongClubName: Story = { args: { clubName: claimLinkScenarios.longClubName } }
/** A guest's own invite link (D-2026-11-18-07): a name only, so no Player ID and no Email row. */
const guestRecord = {
  preview: { ...claimLinkScenarios.preview, rtrId: null, picture: null, maskedPhone: '' },
  maskedEmail: '',
}
export const GuestRecord: Story = { args: guestRecord }
export const GuestRecordLight: Story = { args: guestRecord, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
