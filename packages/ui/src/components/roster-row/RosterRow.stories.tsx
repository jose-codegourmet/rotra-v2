import { clubPlayers } from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { RosterRow, type RosterRowProps } from './RosterRow'

// The tonight fixture: 14 players, Joanna (index 5) missing a level, the first 10 present.
const rowAt = (i: number): RosterRowProps => {
  const r = queueSessionFixtures.roster[i]
  const p = clubPlayers.find((x) => x.id === r?.clubPlayerId)
  if (!r || !p) throw new Error('Roster fixture missing')
  return {
    name: r.nameSnapshot,
    identity: p.identity,
    suggestion: p.playingLevel,
    level: r.level,
    present: r.present,
    onOpenProfile: fn(),
    onLevelChange: fn(),
    onPresentChange: fn(),
    onRemove: fn(),
  }
}

function Demo(props: RosterRowProps) {
  const [level, setLevel] = useState<PlayingLevel | null>(props.level)
  const [present, setPresent] = useState(props.present)
  return (
    <RosterRow
      {...props}
      level={level}
      present={present}
      onLevelChange={(l) => {
        setLevel(l)
        props.onLevelChange(l)
      }}
      onPresentChange={(p) => {
        setPresent(p)
        props.onPresentChange(p)
      }}
    />
  )
}

const meta = {
  title: 'Queue/RosterRow',
  component: RosterRow,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
  args: rowAt(0),
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof RosterRow>

export default meta
type Story = StoryObj<typeof meta>

export const MatchesSuggestion: Story = {}
export const MissingLevel: Story = { args: rowAt(5) }
export const BelowSuggestion: Story = { args: { ...rowAt(1), level: 'intermediate_low' } }
export const AboveSuggestion: Story = { args: { ...rowAt(3), level: 'advanced_mid' } }
export const NoSuggestion: Story = { args: rowAt(7) }
export const NotPresent: Story = { args: rowAt(11) }
export const Locked: Story = { args: { ...rowAt(0), levelLocked: true } }
export const Phone: Story = {
  args: { ...rowAt(1), level: 'intermediate_low' },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { ...rowAt(1), level: 'intermediate_low' },
  globals: { viewport: { value: 'desktop' } },
}
