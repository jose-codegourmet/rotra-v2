import { adminClubRows, clubAccessExamples } from '@rotra/data/fixtures/admin-clubs'
import { adminPlayers } from '@rotra/data/fixtures/players'
import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { ClubLogo } from '@rotra/ui/club-logo'
import { LicenseAccessChip } from '@rotra/ui/license-access-chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { DetailHero } from './DetailHero'

const club = adminClubRows[0]
const player = adminPlayers[3]
if (!club || !player) throw new Error('Admin fixtures missing')
const longClub = adminClubRows.reduce((a, b) => (b.name.length > a.name.length ? b : a))

const clubMeta = (
  <>
    <LicenseAccessChip access={clubAccessExamples.active} />
    <Chip>{clubAccessExamples.active.plan}</Chip>
    {club.runningSessionTitle ? (
      <span className="inline-flex items-center gap-1.5 text-[13px]">
        <i
          aria-hidden
          className="size-2 flex-none rounded-full bg-accent animate-[pulse_1.6s_infinite] motion-reduce:animate-none"
        />
        Session running
      </span>
    ) : null}
  </>
)

const playerMeta = (
  <>
    <Chip tone="accent">Registered</Chip>
    <span className="font-mono text-[13px] text-fg2 [overflow-wrap:anywhere]">{player.rtrId}</span>
  </>
)

const meta = {
  title: 'Admin/DetailHero',
  component: DetailHero,
  args: {
    media: <ClubLogo initials={club.initials} logoUrl={club.logoUrl} size="lg" tone="accent" />,
    title: club.name,
    meta: clubMeta,
  },
} satisfies Meta<typeof DetailHero>

export default meta
type Story = StoryObj<typeof meta>

export const Club: Story = {}
export const Player: Story = {
  args: {
    media: <Avatar name={player.fullName} size={52} />,
    title: player.fullName,
    meta: playerMeta,
  },
}
export const LongName: Story = {
  args: {
    media: <ClubLogo initials={longClub.initials} logoUrl={longClub.logoUrl} size="lg" />,
    title: `${longClub.name} ${longClub.name}`,
    meta: <LicenseAccessChip access={clubAccessExamples.expired} />,
  },
  globals: { viewport: { value: 'phone' } },
}
export const ClubLight: Story = { globals: { theme: 'light' } }
export const PlayerLight: Story = { ...Player, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
