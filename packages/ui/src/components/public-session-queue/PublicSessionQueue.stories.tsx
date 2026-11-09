import type { PlayerSessionAccess } from '@rotra/data/public-session/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicSessionQueue } from './PublicSessionQueue'

const meta = {
  title: 'Queue/PublicSession/PublicSessionQueue',
  component: PublicSessionQueue,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: { access: null, loginHref: 'https://player.rotra.club/login', onRetry: fn() },
} satisfies Meta<typeof PublicSessionQueue>
export default meta
type Story = StoryObj<typeof meta>
/** Every story supports dark and light via the theme toolbar. */
export const SignedOut: Story = {}
export const Checking: Story = { args: { checking: true } }
export const Failed: Story = { args: { failed: true } }
export const Empty: Story = {
  args: { access: { playerId: 'fixture', fullRoster: false, participants: [], queue: [] } },
}
const NAMES = [
  'Jamie A***',
  'M***',
  'K***',
  'A***',
  'Y***',
  'Rico Dela Cruz',
  'Bea Lim',
  'Noel',
  'Tess Uy',
  'Paolo',
]
const side = (seed: number, size: number) =>
  Array.from({ length: size }, (_, i) => ({
    name: NAMES[(seed + i) % NAMES.length] ?? 'Player',
    level: 'intermediate_mid' as const,
  }))
const match = (matchNo: number, a: number, b: number): PlayerSessionAccess['queue'][number] => ({
  matchNo,
  format: a === 1 && b === 1 ? 'singles' : 'doubles',
  teamA: side(matchNo, a),
  teamB: side(matchNo + 5, b),
})
const accessOf = (sizes: [number, number][]): PlayerSessionAccess => ({
  playerId: 'fixture',
  fullRoster: false,
  participants: [],
  queue: sizes.map(([a, b], i) => match(i + 1, a, b)),
})
/** The Full house scenario's waiting queue, in order. */
const FULL_HOUSE: [number, number][] = [
  [3, 3],
  [5, 5],
  [1, 2],
  [4, 4],
  [2, 2],
  [1, 1],
  [1, 2],
  [3, 3],
  [2, 2],
  [4, 4],
]

/** One match: #1 pinned with Next, no scroll box. */
export const OneMatch: Story = { args: { access: accessOf([[2, 2]]) } }
/** Two to three matches: scroll box without fade. */
export const ThreeMatches: Story = {
  args: {
    access: accessOf([
      [2, 2],
      [1, 1],
      [2, 2],
    ]),
  },
}
/** Ten matches: the bottom fades until scrolled to the end. */
export const TenMatchesFullHouse: Story = { args: { access: accessOf(FULL_HOUSE) } }
/** 1 v 1 up to 5 v 5 rows, masked and full first names. */
export const MixedSizes: Story = {
  args: {
    access: accessOf([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ]),
  },
}
