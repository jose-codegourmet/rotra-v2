import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StandingsPlayerCell } from './StandingsFaces'

const NAMES = [
  'Maya Santos',
  'Ben Cruz',
  'Jose Buctuanon',
  'Ana Lim',
  'Carlo Reyes',
  'Bea Villanueva-Dela Cruz',
]
const faces = (count: number) =>
  NAMES.slice(0, count).map((name, i) => ({ id: `p${i}`, name, onOpen: fn() }))
const cell = (count: number) => ({
  faces: faces(count),
  names: <b>{NAMES.slice(0, count).join(', ')}</b>,
})

const meta = {
  title: 'Queue/StandingsFaces',
  component: StandingsPlayerCell,
  decorators: [
    (Story) => (
      <div className="w-[260px] rounded-lg bg-surface p-3">
        <Story />
      </div>
    ),
  ],
  args: cell(1),
} satisfies Meta<typeof StandingsPlayerCell>
export default meta
type Story = StoryObj<typeof meta>

export const One: Story = { globals: { theme: 'dark' } }
export const OneLight: Story = { globals: { theme: 'light' } }
export const Two: Story = { args: cell(2), globals: { theme: 'dark' } }
export const TwoLight: Story = { args: cell(2), globals: { theme: 'light' } }
export const Three: Story = { args: cell(3), globals: { theme: 'dark' } }
export const ThreeLight: Story = { args: cell(3), globals: { theme: 'light' } }
export const Six: Story = { args: cell(6), globals: { theme: 'dark' } }
export const SixLight: Story = { args: cell(6), globals: { theme: 'light' } }

/** A masked player's face has no profile button. */
export const PlainFace: Story = {
  args: {
    faces: [
      { id: 'a', name: 'Maya Santos', onOpen: fn() },
      { id: 'b', name: 'Y*** R***' },
    ],
    names: <b>Maya Santos, Y*** R***</b>,
  },
}
