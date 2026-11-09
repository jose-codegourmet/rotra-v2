import { clubs } from '@rotra/data/fixtures/clubs'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionInviteCard } from './ShareCard'

const club = clubs[0]!
const session = queueSessionFixtures.sessions[0]!
// Self-contained vector fixture: explicit dimensions and paths avoid SVG font/emoji canvas differences.
const avatarUrl = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#4f8cff"/><circle cx="50" cy="38" r="18" fill="#fff"/><path d="M16 92c4-26 20-34 34-34s30 8 34 34Z" fill="#fff"/></svg>`)}`
const meta = {
  title: 'Queue/ShareCard',
  component: SessionInviteCard,
  args: {
    link: `https://rotra.example/s/${session.publicSlug}?invite=k3m9x2pq`,
    slug: session.publicSlug,
    inviterName: 'Mikee Abellana',
    clubName: club.name,
    clubInitials: club.initials,
    sessionTitle: session.title,
    dateLabel: new Date(session.scheduledStartAt).toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: `${new Date(session.scheduledStartAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}–${new Date(session.scheduledEndAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`,
    venueName: session.venueName,
    webShare: true,
  },
  decorators: [(Story) => <div className="mx-auto max-w-[480px]">{Story()}</div>],
} satisfies Meta<typeof SessionInviteCard>
export default meta
type Story = StoryObj<typeof meta>

export const SessionInvitePost: Story = { globals: { theme: 'dark' } }
export const SessionInviteStory: Story = {
  args: { initialFormat: 'story' },
  globals: { theme: 'dark' },
}
export const SessionInviteWaitlistOpen: Story = {
  args: { waitlistOpen: true },
  globals: { theme: 'dark' },
}
export const SessionInviteAvatar: Story = {
  args: { inviterAvatarUrl: avatarUrl },
  globals: { theme: 'dark' },
}
export const SessionInviteDownloadOnly: Story = {
  args: { webShare: false },
  globals: { theme: 'dark' },
}
export const SessionInvitePostLight: Story = { globals: { theme: 'light' } }
export const SessionInviteStoryLight: Story = {
  args: { initialFormat: 'story' },
  globals: { theme: 'light' },
}
export const SessionInviteWaitlistOpenLight: Story = {
  args: { waitlistOpen: true },
  globals: { theme: 'light' },
}
export const SessionInviteAvatarLight: Story = {
  args: { inviterAvatarUrl: avatarUrl },
  globals: { theme: 'light' },
}
export const SessionInviteDownloadOnlyLight: Story = {
  args: { webShare: false },
  globals: { theme: 'light' },
}
export const LongNames: Story = {
  args: {
    inviterName: 'Maria Cristina Dela Cruz-Santos',
    sessionTitle: `${session.title} · ${session.title}`,
    venueName: `${session.venueName} · ${session.venueName}`,
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
