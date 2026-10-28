import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerAboutCard } from './PlayerAboutCard'

const full = playerProfiles.find((p) => p.fullName === 'Jose')
const empty = playerProfiles.find(
  (p) => !p.playingStyle && !Object.values(p.socialLinks).some(Boolean),
)
const linksOnly = playerProfiles.find((p) => p.fullName === 'Raymark')
if (!full || !empty || !linksOnly) throw new Error('Missing public profile fixture')
const meta = {
  title: 'Player/PlayerAboutCard',
  component: PlayerAboutCard,
  args: { profile: full },
} satisfies Meta<typeof PlayerAboutCard>
export default meta
type Story = StoryObj<typeof meta>
export const Full: Story = {}
export const EmptyPublic: Story = { args: { profile: empty } }
export const EmptyOwn: Story = { args: { profile: empty, isOwn: true } }
export const LinksOnly: Story = { args: { profile: linksOnly } }
