import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Notice } from '@rotra/ui/notice'
import { PlayerIdBreakdown } from './PlayerIdBreakdown'

const migs = playerProfiles.find((p) => p.nickname === 'Migs')
if (!migs) throw new Error('Missing public profile fixture')
const meta = {
  title: 'Player/PlayerIdBreakdown',
  component: PlayerIdBreakdown,
  args: { rtrId: migs.rtrId },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof PlayerIdBreakdown>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Offline: Story = {
  args: {
    offlineNotice: (
      <Notice tone="warn">
        Saved on this device. A club seeing you for the first time may need internet to look you up.
      </Notice>
    ),
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
