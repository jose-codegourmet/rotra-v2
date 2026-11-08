import { clubs } from '@rotra/data/fixtures/clubs'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionJoinQr } from './SessionJoinQr'

const club = clubs[0]!
const session = queueSessionFixtures.sessions[0]!
// Self-contained image fixture: no external host or CORS dependency in logo stories.
const logoUrl = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="68" text-anchor="middle" font-size="50">🏸</text></svg>`)}`
const meta = {
  title: 'Queue/SessionJoinQr',
  component: SessionJoinQr,
  args: {
    link: `https://rotra.example/s/${session.publicSlug}`,
    slug: session.publicSlug,
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
  },
  decorators: [(Story) => <div className="mx-auto max-w-[480px]">{Story()}</div>],
} satisfies Meta<typeof SessionJoinQr>
export default meta
type Story = StoryObj<typeof meta>
export const PostInitials: Story = { globals: { theme: 'dark' } }
export const PostLogo: Story = { args: { clubLogoUrl: logoUrl }, globals: { theme: 'dark' } }
export const StoryInitials: Story = { args: { initialFormat: 'story' }, globals: { theme: 'dark' } }
export const StoryLogo: Story = {
  args: { initialFormat: 'story', clubLogoUrl: logoUrl },
  globals: { theme: 'dark' },
}
export const PostInitialsLight: Story = { globals: { theme: 'light' } }
export const PostLogoLight: Story = { args: { clubLogoUrl: logoUrl }, globals: { theme: 'light' } }
export const StoryInitialsLight: Story = {
  args: { initialFormat: 'story' },
  globals: { theme: 'light' },
}
export const StoryLogoLight: Story = {
  args: { initialFormat: 'story', clubLogoUrl: logoUrl },
  globals: { theme: 'light' },
}
export const LongNames: Story = {
  args: {
    clubName: `${club.name} · ${club.name}`,
    sessionTitle: `${session.title} · ${session.title}`,
    venueName: `${session.venueName} · ${session.venueName}`,
  },
}
export const UnavailableQr: Story = { args: { link: '' } }
export const UnavailableLogo: Story = { args: { clubLogoUrl: 'data:image/png;base64,broken' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
