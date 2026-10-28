import { clubPlayers } from '@rotra/data/fixtures/players'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { LevelSelect } from './LevelSelect'

const jose = clubPlayers[0]
if (!jose) throw new Error('Player fixture missing')
const label = `Level for ${jose.fullName} at this club`

function Demo({
  initial = null,
  ...rest
}: {
  initial?: PlayingLevel | null
  missing?: boolean
  disabled?: boolean
}) {
  const [level, setLevel] = useState<PlayingLevel | null>(initial)
  return <LevelSelect value={level} onChange={setLevel} aria-label={label} {...rest} />
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
  args: { value: null, onChange: fn(), 'aria-label': label },
} satisfies Meta<typeof LevelSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { render: () => <Demo /> }
export const Chosen: Story = { render: () => <Demo initial={jose.playingLevel} /> }
export const Missing: Story = { render: () => <Demo missing /> }
export const Locked: Story = { render: () => <Demo initial={jose.playingLevel} disabled /> }
