import { clubPlayers } from '@rotra/data/fixtures/players'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { LevelSelect } from './LevelSelect'

const migs = clubPlayers[0]
if (!migs) throw new Error('Player fixture missing')

function Demo({
  initial = null,
  ...rest
}: {
  initial?: PlayingLevel | null
  missing?: boolean
  disabled?: boolean
}) {
  const [level, setLevel] = useState<PlayingLevel | null>(initial)
  return (
    <LevelSelect
      value={level}
      onChange={setLevel}
      aria-label={`Level for ${migs.nickname} at this club`}
      {...rest}
    />
  )
}

const meta = {
  title: 'Queue/LevelSelect',
  component: LevelSelect,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  args: { value: null, onChange: fn(), 'aria-label': `Level for ${migs.nickname} at this club` },
} satisfies Meta<typeof LevelSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { render: () => <Demo /> }
export const Chosen: Story = { render: () => <Demo initial={migs.playingLevel} /> }
export const Missing: Story = { render: () => <Demo missing /> }
export const Locked: Story = { render: () => <Demo initial={migs.playingLevel} disabled /> }
