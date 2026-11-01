import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import { AdminPlayerActions } from '@rotra/ui/admin-player-actions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AdminPlayerCard } from './AdminPlayerCard'

const meta = {
  title: 'Admin/AdminPlayerCard',
  component: AdminPlayerCard,
  args: { player: managementPlayer, href: '#', createdBy: 'Created by Admin', onOpen: () => {} },
} satisfies Meta<typeof AdminPlayerCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const Archived: Story = {
  args: { player: { ...managementPlayer, archivedAt: '2026-10-31' } },
}
export const LongName: Story = {
  args: {
    player: {
      ...managementPlayer,
      name: 'Alexandria Maria Reyes de la Cruz',
      nickname: 'Alexandria',
    },
  },
}
export const FiveClubs: Story = {
  args: {
    player: {
      ...managementPlayer,
      clubs: Array.from({ length: 5 }, (_, i) => ({
        clubId: String(i),
        name: `Club ${i + 1}`,
        addedAt: null,
        identity: i === 3 ? 'pending' : i === 4 ? 'guest' : 'unclaimed',
      })),
    },
  },
}

export const Selectable: Story = {
  args: { actions: <AdminPlayerActions player={managementPlayer} onAction={() => {}} /> },
  render: (args) => {
    const [selected, setSelected] = useState(false)
    return <AdminPlayerCard {...args} selected={selected} onSelect={setSelected} />
  },
}
export const SelectableLight: Story = { ...Selectable, globals: { theme: 'light' } }
export const Selected: Story = { args: { selected: true, onSelect: () => {} } }
