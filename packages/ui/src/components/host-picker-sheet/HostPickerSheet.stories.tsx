import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type HostCandidate, HostPickerSheet } from './HostPickerSheet'

// The Queue prototype's seed: Miguel and Gab Torres are trusted hosts; the rest are saved players.
const candidates: HostCandidate[] = [
  {
    clubPlayerId: 'p1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    shortName: 'Kuya Migs',
    identity: 'registered',
    trusted: true,
  },
  { clubPlayerId: 'p17', name: 'Gab Torres', identity: 'unclaimed', trusted: true },
  { clubPlayerId: 'p2', name: 'Bea Castillo', identity: 'registered', trusted: false },
  { clubPlayerId: 'p8', name: 'Lia Bautista', identity: 'guest', trusted: false },
  {
    clubPlayerId: 'p3',
    name: 'Jomar dela Cruz',
    nickname: 'Jom',
    identity: 'unclaimed',
    trusted: false,
  },
  {
    clubPlayerId: 'p6',
    name: 'Joanna Tan',
    identity: 'unclaimed',
    detailsRequired: true,
    trusted: false,
  },
]

const meta = {
  title: 'Queue/HostPickerSheet',
  component: HostPickerSheet,
  args: { open: true, candidates, onOpenChange: fn(), onPick: fn(), onPickNew: fn() },
} satisfies Meta<typeof HostPickerSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
/** Both trusted hosts are already picked: only other saved players are left. */
export const TrustedAllPicked: Story = {
  args: { candidates: candidates.filter((c) => !c.trusted) },
}
export const NoTrustedHosts: Story = {
  args: { candidates: candidates.map((c) => ({ ...c, trusted: false })) },
}
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
