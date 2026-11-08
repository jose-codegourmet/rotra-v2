import { clubs } from '@rotra/data/fixtures/clubs'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionJoinQr } from './SessionJoinQr'

const club = clubs[0]!
const session = queueSessionFixtures.sessions[0]!
// Self-contained vector fixture: explicit dimensions and paths avoid SVG font/emoji canvas differences.
const logoUrl = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 67 72 23 80 47 52 75Z"/><path d="m28 67 13 13M38 57l28-28M48 65l27-27M55 39l16 16"/><path d="m22 73 12 12c-8 8-18 2-12-12Z"/></g></svg>`)}`
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
