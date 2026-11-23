import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import type { HostCandidate } from '../host-picker-sheet/HostPickerSheet'
import { type SessionHostRow, SessionHostsCard } from './SessionHostsCard'

const hosts: SessionHostRow[] = [
  { clubPlayerId: 'p1', name: 'Miguel Santos', registration: 'slot' },
  { clubPlayerId: 'p17', name: 'Gab Torres', registration: 'waitlist' },
]

const candidates: HostCandidate[] = [
  { clubPlayerId: 'p2', name: 'Bea Castillo', identity: 'registered', trusted: true },
  { clubPlayerId: 'p8', name: 'Lia Bautista', identity: 'guest', trusted: false },
  {
    clubPlayerId: 'p3',
    name: 'Jomar dela Cruz',
    nickname: 'Jom',
    identity: 'unclaimed',
    trusted: false,
  },
]

const meta = {
  title: 'Queue/SessionHostsCard',
  component: SessionHostsCard,
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
  args: {
    hosts,
    candidates,
    openSlots: 2,
    onAdd: fn(),
    onAddNew: fn(),
    onRemove: fn(),
    onAddOpenChange: fn(),
  },
} satisfies Meta<typeof SessionHostsCard>

export default meta
type Story = StoryObj<typeof meta>

/** Adds and removes in the story, so the list changes like the prototype. */
export const Default: Story = {
  render: (args) => {
    const [list, setList] = useState(args.hosts)
    const [pool, setPool] = useState(args.candidates)
    const add = (clubPlayerId: string) => {
      const p = pool.find((c) => c.clubPlayerId === clubPlayerId)
      if (!p) return
      setPool(pool.filter((c) => c.clubPlayerId !== clubPlayerId))
      setList([...list, { clubPlayerId, name: p.name, registration: 'slot' }])
    }
    return (
      <SessionHostsCard
        {...args}
        hosts={list}
        candidates={pool}
        onAdd={(id) => {
          add(id)
          args.onAdd(id)
        }}
        onAddNew={(id) => {
          add(id)
          args.onAddNew(id)
        }}
        onRemove={(id) => {
          setList(list.filter((h) => h.clubPlayerId !== id))
          args.onRemove(id)
        }}
      />
    )
  },
}
export const Light: Story = { ...Default, globals: { theme: 'light' } }
export const Live: Story = { ...Default, args: { live: true } }
export const Empty: Story = { args: { hosts: [] } }
export const Full: Story = { args: { openSlots: 0 } }
export const NoCandidates: Story = { args: { candidates: [] } }
export const WithdrawnHost: Story = {
  args: { hosts: [{ clubPlayerId: 'p1', name: 'Miguel Santos', registration: null }] },
}
export const Pending: Story = { args: { isPending: true } }
export const AddSheetOpen: Story = { args: { addOpen: true } }
export const AddSheetOpenLight: Story = { args: { addOpen: true }, globals: { theme: 'light' } }
export const Phone: Story = { ...Default, globals: { viewport: { value: 'phone' } } }
