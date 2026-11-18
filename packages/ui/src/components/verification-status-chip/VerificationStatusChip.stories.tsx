import type { Meta, StoryObj } from '@storybook/react-vite'
import { VerificationStatusChip } from './VerificationStatusChip'

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
