import { clubPlayers } from '@rotra/data/fixtures/players'
import { levelLabel } from '@rotra/ui/level-pill'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type ClubMemberCell, ClubMemberGrid } from './ClubMemberGrid'

const mask = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w[0]}***`)
    .join(' ')
const named: ClubMemberCell[] = clubPlayers.slice(0, 12).map((p, i) => ({
  key: p.id,
  name: i === 3 ? mask(p.fullName) : p.fullName,
  caption: i === 0 ? 'You' : levelLabel(p.playingLevel),
  openable: i !== 3,
}))
const masked: ClubMemberCell[] = named.map((m, i) => ({
  ...m,
  name: mask(clubPlayers[i]?.fullName ?? ''),
  caption: levelLabel(clubPlayers[i]?.playingLevel ?? null),
  openable: false,
}))

const meta = {
  title: 'Player/ClubMemberGrid',
  component: ClubMemberGrid,
  args: {
    members: named,
    totalCount: 23,
    signedIn: true,
    onShowMore: fn(),
    seeAllHref: '#',
    onOpen: fn(),
  },
} satisfies Meta<typeof ClubMemberGrid>
export default meta
type Story = StoryObj<typeof meta>
/** Signed in: names, You on the own cell; the fourth member is always-private (masked, no button). */
export const SignedIn: Story = {}
export const SignedOut: Story = { args: { members: masked, signedIn: false } }
export const AllShown: Story = { args: { members: named.slice(0, 5), totalCount: 5 } }
export const Empty: Story = { args: { members: [], totalCount: 0 } }
export const SignedInLight: Story = { globals: { theme: 'light' } }
export const SignedOutLight: Story = { ...SignedOut, globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
