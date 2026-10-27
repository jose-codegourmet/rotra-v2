import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import { shortName } from '@rotra/data/match/match.rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PlayerFaceButton, type PlayerFaceButtonProps } from './PlayerFaceButton'

const faceAt = (i: number, team: 'A' | 'B' = 'A'): PlayerFaceButtonProps => {
  const p = consoleSessionFixture.roster[i]
  if (!p) throw new Error('Roster fixture missing')
  return {
    name: p.nameSnapshot,
    shortName: shortName(p),
    level: p.level,
    label: `${p.nameSnapshot}, Team ${team}. View profile`,
    onClick: fn(),
  }
}

const meta = {
  title: 'Queue/PlayerFaceButton',
  component: PlayerFaceButton,
  decorators: [
    (Story) => (
      <div className="inline-grid place-items-center rounded-md bg-court p-4">
        <Story />
      </div>
    ),
  ],
  args: faceAt(0),
} satisfies Meta<typeof PlayerFaceButton>

export default meta
type Story = StoryObj<typeof meta>

export const OnCourt: Story = {}
export const Size28: Story = { args: { ...faceAt(1), size: 28 } }
export const Size24Compact: Story = { args: { ...faceAt(2), size: 24, compact: true } }
export const NoLevel: Story = { args: { ...faceAt(5), level: null } }
export const LongName: Story = {
  args: {
    ...faceAt(3),
    shortName: 'Maria Consolacion',
    name: 'Maria Consolacion Dela Cruz Villareal',
  },
}
export const OnQueueCard: Story = {
  args: { ...faceAt(0), size: 'queue' },
  decorators: [
    (Story) => (
      <div className="inline-grid place-items-center rounded-md bg-surface p-4">
        <Story />
      </div>
    ),
  ],
}
export const WithSwap: Story = {
  args: {
    ...faceAt(0),
    size: 'queue',
    swap: { team: 'A', index: 0, onSwap: fn() },
  },
  decorators: OnQueueCard.decorators,
}
export const Phone: Story = {
  args: { ...faceAt(0), size: 'queue' },
  decorators: OnQueueCard.decorators,
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
