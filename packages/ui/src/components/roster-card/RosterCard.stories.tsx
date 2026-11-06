import { clubPlayers } from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { RosterCard, type RosterCardProps } from './RosterCard'

const rowAt = (i: number): RosterCardProps => {
  const r = queueSessionFixtures.roster[i]
  const p = clubPlayers.find((x) => x.id === r?.clubPlayerId)
  if (!r || !p) throw new Error('Roster fixture missing')
  return {
    name: r.nameSnapshot,
    identity: p.identity,
    suggestion: p.playingLevel,
    level: r.level,
    present: r.present,
    paid: i < 12,
    onOpenProfile: fn(),
    onLevelChange: fn(),
    onPresentChange: fn(),
    onRemove: fn(),
  }
}

function Demo(props: RosterCardProps) {
  const [level, setLevel] = useState<PlayingLevel | null>(props.level)
  const [present, setPresent] = useState(props.present)
  return (
    <div className="max-w-[220px]">
      <RosterCard
        {...props}
        level={level}
        present={present}
        onLevelChange={(next) => {
          setLevel(next)
          props.onLevelChange(next)
        }}
        onPresentChange={(next) => {
          setPresent(next)
          props.onPresentChange(next)
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Queue/RosterCard',
  component: RosterCard,
  args: rowAt(0),
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof RosterCard>

export default meta
type Story = StoryObj<typeof meta>

export const MatchesSuggestion: Story = {}
export const MissingLevel: Story = { args: rowAt(5) }
export const BelowSuggestion: Story = { args: { ...rowAt(1), level: 'intermediate_low' } }
export const AboveSuggestion: Story = { args: { ...rowAt(3), level: 'advanced_mid' } }
export const NoSuggestion: Story = { args: rowAt(7) }
export const NotPresent: Story = { args: rowAt(11) }
export const NotPaid: Story = { args: { ...rowAt(0), paid: false } }
export const Guest: Story = { args: { ...rowAt(0), identity: 'guest' } }
export const Locked: Story = { args: { ...rowAt(0), levelLocked: true } }
export const ReadOnly: Story = { args: { ...rowAt(0), levelLocked: true, readOnly: true } }
export const ReadOnlyAway: Story = {
  args: { ...rowAt(11), levelLocked: true, readOnly: true, paid: false },
}
export const SavingPresence: Story = { args: { ...rowAt(0), presencePending: true } }
export const Phone: Story = {
  args: { ...rowAt(1), level: 'intermediate_low' },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { ...rowAt(1), level: 'intermediate_low' },
  globals: { viewport: { value: 'desktop' } },
}
