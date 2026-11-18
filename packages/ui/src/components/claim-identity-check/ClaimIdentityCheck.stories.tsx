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
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
