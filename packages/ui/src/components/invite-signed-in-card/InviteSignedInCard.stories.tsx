import type { Meta, StoryObj } from '@storybook/react-vite'
import { InviteSignedInCard } from './InviteSignedInCard'

const meta = {
  title: 'Player/InviteSignedInCard',
  component: InviteSignedInCard,
  args: {
    player: { name: 'Jose Buctuanon' },
    state: { kind: 'club', clubName: 'Lahug Smash Club' },
    onJoinClub: () => {},
    onContinueToRequest: () => {},
    onOpenProfile: () => {},
  },
} satisfies Meta<typeof InviteSignedInCard>
export default meta
type Story = StoryObj<typeof meta>
export const ClubReady: Story = {}
export const ClubJoining: Story = { args: { pending: true } }
export const ClubError: Story = { args: { error: "Couldn't join the club. Try again." } }
export const ClubAlreadyMember: Story = {
  args: { state: { kind: 'club-member', clubName: 'Lahug Smash Club' } },
}
export const SessionReady: Story = {
  args: { state: { kind: 'session', inviterShortName: 'Mikee' } },
}
export const SessionReadyNoInviter: Story = { args: { state: { kind: 'session' } } }
export const OwnInvite: Story = { args: { state: { kind: 'own-invite' } } }
export const AlreadyIn: Story = {
  args: { state: { kind: 'already-in', sessionTitle: 'Thursday Open Play' } },
}
export const OnWaitlist: Story = {
  args: { state: { kind: 'on-waitlist', sessionTitle: 'Thursday Open Play' } },
}
export const ClubReadyLight: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
