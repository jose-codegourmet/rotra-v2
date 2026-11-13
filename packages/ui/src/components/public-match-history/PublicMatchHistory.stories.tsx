import type { MatchCourtPlayer } from '@rotra/ui/match-court'
import { Skeleton } from '@rotra/ui/skeleton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicMatchHistory, type PublicMatchHistoryItem } from './PublicMatchHistory'

const face = (name: string, label = name.split(' ')[0] ?? name): MatchCourtPlayer => ({
  key: name,
  name,
  label,
  onOpen: () => {},
})
const items: PublicMatchHistoryItem[] = [
  {
    id: 'm3',
    number: 14,
    timeLabel: '8:40–9:02 PM',
    left: [face('Jose Buctuanon', 'You'), face('Maya Santos')],
    right: [face('Ben Cruz'), face('Y*** R***')],
    winner: 'left',
    score: '21–18',
    mine: true,
  },
  {
    id: 'm2',
    number: 9,
    timeLabel: '8:01–8:20 PM',
    fun: true,
    left: [face('Jose Buctuanon', 'You')],
    right: [face('Ana Lim'), face('Carlo Reyes')],
    winner: 'right',
    score: null,
    mine: true,
  },
]
const meta = {
  title: 'Queue/PublicMatchHistory',
  component: PublicMatchHistory,
  args: {
    signedIn: true,
    tab: 'mine',
    onTabChange: () => {},
    mineCount: 2,
    allCount: 18,
    shared: true,
    items,
  },
} satisfies Meta<typeof PublicMatchHistory>
export default meta
type Story = StoryObj<typeof meta>

export const Yours: Story = { globals: { theme: 'dark' } }
export const YoursLight: Story = { globals: { theme: 'light' } }
export const AllWithReplay: Story = {
  args: {
    tab: 'all',
    items: items.map((item, i) => ({ ...item, mine: false, now: i === 0 })),
    replay: <Skeleton className="h-64 rounded-lg" />,
  },
}
export const AllNotShared: Story = { args: { tab: 'all', shared: false, items: [] } }
export const YoursEmpty: Story = { args: { mineCount: 0, items: [] } }
export const Visitor: Story = { args: { signedIn: false } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
