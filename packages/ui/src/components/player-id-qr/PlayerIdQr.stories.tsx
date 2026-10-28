import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerIdQr } from './PlayerIdQr'

const jose = playerProfiles.find((p) => p.fullName === 'Jose')
if (!jose) throw new Error('Missing public profile fixture')
const meta = {
  title: 'Player/PlayerIdQr',
  component: PlayerIdQr,
  args: { rtrId: jose.rtrId, id: 'story-rtr-big', onCopy: () => {} },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof PlayerIdQr>
export default meta
type Story = StoryObj<typeof meta>
export const Jose: Story = {}
export const LongSequence: Story = { args: { rtrId: 'RTR-PH-MNL-102526-000123' } }
export const EncoderFailure: Story = { args: { draw: () => null } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
