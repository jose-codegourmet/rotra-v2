import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicVerificationChip, VerificationStatusChip } from './VerificationStatusChip'

const meta = {
  title: 'Player/VerificationStatusChip',
  component: VerificationStatusChip,
  args: { completedSteps: 0 },
} satisfies Meta<typeof VerificationStatusChip>

export default meta
type Story = StoryObj<typeof meta>

export const ZeroOfThree: Story = {}
export const OneOfThree: Story = { args: { completedSteps: 1 } }
export const TwoOfThree: Story = { args: { completedSteps: 2 } }
export const Verified: Story = { args: { completedSteps: 3 } }
export const VerifiedByAdmin: Story = { args: { verifiedByAdmin: true } }

export const ZeroOfThreeLight: Story = { ...ZeroOfThree, globals: { theme: 'light' } }
export const OneOfThreeLight: Story = { ...OneOfThree, globals: { theme: 'light' } }
export const TwoOfThreeLight: Story = { ...TwoOfThree, globals: { theme: 'light' } }
export const VerifiedLight: Story = { ...Verified, globals: { theme: 'light' } }
export const VerifiedByAdminLight: Story = { ...VerifiedByAdmin, globals: { theme: 'light' } }

/** Others see the result only on the public profile (D-2026-11-23-07). */
const publicChips = (
  <div className="flex flex-wrap gap-2">
    <PublicVerificationChip verified />
    <PublicVerificationChip verified={false} />
  </div>
)
export const PublicResult: Story = { render: () => publicChips }
export const PublicResultLight: Story = { render: () => publicChips, globals: { theme: 'light' } }
