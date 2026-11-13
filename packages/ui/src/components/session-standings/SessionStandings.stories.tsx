import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionStandings, type SessionStandingsRow } from './SessionStandings'

const NAMES = ['Maya Santos', 'Ben Cruz', 'Jose Buctuanon', 'Y*** R***', 'Ana Lim', 'Carlo Reyes']
const rows: SessionStandingsRow[] = NAMES.map((name, i) => ({
  id: String(i + 1),
  position: i + 1,
  name,
  wins: 6 - i,
  losses: i,
  games: 6,
  isViewer: i === 2,
  onOpen: name.includes('*') ? undefined : () => {},
}))
const meta = {
  title: 'Queue/SessionStandings',
  component: SessionStandings,
  args: {
    rows,
    viewer: { name: 'Jose Buctuanon' },
    onShareFinish: () => {},
    onShareLeaderboard: () => {},
  },
} satisfies Meta<typeof SessionStandings>
export default meta
type Story = StoryObj<typeof meta>

export const SignedIn: Story = { globals: { theme: 'dark' } }
export const SignedInLight: Story = { globals: { theme: 'light' } }
export const NoCountedGame: Story = {
  args: { rows: rows.map((row) => ({ ...row, isViewer: false })) },
}
export const Visitor: Story = {
  args: { viewer: null, rows: rows.map((row) => ({ ...row, isViewer: false, onOpen: undefined })) },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
