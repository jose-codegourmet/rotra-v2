import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { PlayerAboutCard } from '@rotra/ui/player-about-card'
import { PlayerIdentityCard } from '@rotra/ui/player-identity-card'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileLayout } from './ProfileLayout'

const profile = playerProfiles.find((p) => p.fullName === 'Jose')
if (!profile) throw new Error('Missing public profile fixture')
const meta = {
  title: 'Player/ProfileLayout',
  component: ProfileLayout,
  args: {
    side: (
      <PlayerIdentityCard profile={profile} idElementId="layout-player-id" onCopyId={() => {}} />
    ),
    main: <PlayerAboutCard profile={profile} />,
  },
} satisfies Meta<typeof ProfileLayout>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
