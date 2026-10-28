import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerIdLine } from './PlayerIdLine'
const profile = playerProfiles[0]
if (!profile) throw new Error('Missing public profile fixture')
const meta = { title: 'Player/PlayerIdLine', component: PlayerIdLine, args: { rtrId: profile.rtrId, onCopy: () => {} } } satisfies Meta<typeof PlayerIdLine>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
