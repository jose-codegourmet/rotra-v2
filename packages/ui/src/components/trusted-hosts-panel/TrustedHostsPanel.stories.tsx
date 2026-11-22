import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { type TrustedHostPerson, type TrustedHostRow, TrustedHostsPanel } from './TrustedHostsPanel'

// The Queue prototype's seed: Miguel (registered) and Gab Torres (unclaimed, no ROTRA account).
const hosts: TrustedHostRow[] = [
  {
    clubPlayerId: 'p1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    clubNickname: 'Kuya Migs',
    shortName: 'Kuya Migs',
    identity: 'registered',
    sinceLabel: 'Trusted since Oct 13',
  },
  {
    clubPlayerId: 'p17',
    name: 'Gab Torres',
    identity: 'unclaimed',
    sinceLabel: 'Trusted since Nov 16',
  },
]

const candidates: TrustedHostPerson[] = [
  { clubPlayerId: 'p2', name: 'Bea Castillo', identity: 'registered' },
  { clubPlayerId: 'p8', name: 'Lia Bautista', identity: 'guest' },
  { clubPlayerId: 'p3', name: 'Jomar dela Cruz', nickname: 'Jom', identity: 'unclaimed' },
  {
    clubPlayerId: 'p6',
    name: 'Joanna Tan',
    nickname: 'Jo',
    identity: 'unclaimed',
    detailsRequired: true,
  },
  { clubPlayerId: 'p19', name: 'Kiko Salazar', identity: 'guest' },
]

const meta = {
  title: 'Queue/TrustedHostsPanel',
  component: TrustedHostsPanel,
  decorators: [
    (Story) => (
      <div className="max-w-[820px]">
        <Story />
      </div>
    ),
  ],
  args: { hosts, candidates, onAdd: fn(), onRemove: fn(), onAddOpenChange: fn() },
} satisfies Meta<typeof TrustedHostsPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Adds and removes in the story, so the list and the picker change like the prototype. */
export const Default: Story = {
  render: (args) => {
    const [list, setList] = useState(args.hosts)
    const [pool, setPool] = useState(args.candidates)
    return (
      <TrustedHostsPanel
        {...args}
        hosts={list}
        candidates={pool}
        onAdd={(clubPlayerId) => {
          const p = pool.find((c) => c.clubPlayerId === clubPlayerId)
          if (!p) return
          setPool(pool.filter((c) => c.clubPlayerId !== clubPlayerId))
          setList([...list, { ...p, sinceLabel: 'Trusted since today' }])
          args.onAdd(clubPlayerId)
        }}
        onRemove={(clubPlayerId) => {
          const h = list.find((c) => c.clubPlayerId === clubPlayerId)
          if (!h) return
          setList(list.filter((c) => c.clubPlayerId !== clubPlayerId))
          setPool([...pool, h])
          args.onRemove(clubPlayerId)
        }}
      />
    )
  },
}
export const Light: Story = { ...Default, globals: { theme: 'light' } }
export const Empty: Story = { args: { hosts: [] } }
export const EveryoneTrusted: Story = { args: { candidates: [] } }
export const AddSheetOpen: Story = { args: { addOpen: true } }
export const AddSheetOpenLight: Story = { args: { addOpen: true }, globals: { theme: 'light' } }
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = { ...Default, globals: { viewport: { value: 'phone' } } }
export const PhoneAddSheetOpen: Story = {
  args: { addOpen: true },
  globals: { viewport: { value: 'phone' } },
}
