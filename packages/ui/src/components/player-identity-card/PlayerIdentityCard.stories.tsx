import { playerProfileScenarios, playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerIdentityCard } from './PlayerIdentityCard'

const profile = playerProfiles.find((p) => p.nickname === 'Migs')
const initials = playerProfiles.find((p) => p.nickname === 'Jom')
if (!profile || !initials) throw new Error('Missing public profile fixture')
const meta = {
  title: 'Player/PlayerIdentityCard',
  component: PlayerIdentityCard,
  args: {
    profile,
    idElementId: 'story-player-id',
    onCopyId: () => {},
    onEdit: () => {},
    onOpenPlayerId: () => {},
  },
} satisfies Meta<typeof PlayerIdentityCard>
export default meta
type Story = StoryObj<typeof meta>
export const Public: Story = {}
export const Initials: Story = { args: { profile: initials } }
export const OwnIdentity: Story = { args: { isOwn: true } }
export const LongNameAndNickname: Story = { args: { profile: playerProfileScenarios.longNames } }
export const OwnPhone: Story = {
  args: { isOwn: true },
  globals: { viewport: { value: 'phone' } },
}
