import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type LinkSavedPlayerCandidate, LinkSavedPlayerSheet } from './LinkSavedPlayerSheet'

const PLAYERS: LinkSavedPlayerCandidate[] = [
  {
    id: 'cp1',
    name: 'Andi Cruz',
    nickname: null,
    rtrId: 'RTR-PH-CEB-100726-0061',
    identity: 'registered',
  },
  { id: 'cp2', name: 'Bong Reyes', nickname: 'Bong', rtrId: null, identity: 'guest' },
  {
    id: 'cp3',
    name: 'Iya Mercado',
    nickname: null,
    rtrId: 'RTR-PH-CEB-091626-0055',
    identity: 'registered',
  },
  {
    id: 'cp4',
    name: 'Lance Ybañez',
    nickname: 'LY',
    rtrId: 'RTR-PH-CEB-110426-0085',
    identity: 'registered',
  },
  { id: 'cp5', name: 'Mikee Abellana', nickname: null, rtrId: null, identity: 'unclaimed' },
]

const meta = {
  title: 'Queue/LinkSavedPlayerSheet',
  component: LinkSavedPlayerSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    guestName: 'Raymark',
    players: PLAYERS,
    onChoose: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof LinkSavedPlayerSheet>

export default meta
type Story = StoryObj<typeof meta>

export const List: Story = {}
/** Search "iya" narrows the list; RTR IDs and nicknames match too. */
export const Filtered: Story = { args: { initialQuery: 'iya' } }
export const Empty: Story = { args: { initialQuery: 'zzz' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
