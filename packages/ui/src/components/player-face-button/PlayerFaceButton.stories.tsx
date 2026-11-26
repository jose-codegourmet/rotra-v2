import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import { queueMasterName } from '@rotra/data/match/match.rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PlayerFaceButton, type PlayerFaceButtonProps } from './PlayerFaceButton'

const faceAt = (i: number, team: 'A' | 'B' = 'A'): PlayerFaceButtonProps => {
  const p = consoleSessionFixture.roster[i]
  if (!p) throw new Error('Roster fixture missing')
  return {
    name: p.nameSnapshot,
    shortName: queueMasterName(p),
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
const queueDecorators: Story['decorators'] = [
  (Story) => (
    <div className="inline-grid place-items-center rounded-md bg-surface p-4">
      <Story />
    </div>
  ),
]

export const OnQueueCard: Story = {
  args: { ...faceAt(0), size: 'queue' },
  decorators: queueDecorators,
}
export const Wait3Min: Story = {
  name: '3 min wait',
  args: { ...faceAt(0), size: 'queue', wait: { kind: 'minutes', minutes: 3 } },
  decorators: queueDecorators,
}
export const Wait12Min: Story = {
  name: '12 min wait',
  args: { ...faceAt(1), size: 'queue', wait: { kind: 'minutes', minutes: 12 } },
  decorators: queueDecorators,
}
export const Wait17Min: Story = {
  name: '17 min wait',
  args: { ...faceAt(2), size: 'queue', wait: { kind: 'minutes', minutes: 17 } },
  decorators: queueDecorators,
}
export const WaitOnCourt: Story = {
  args: { ...faceAt(0), size: 'queue', wait: { kind: 'on-court' } },
  decorators: queueDecorators,
}
export const WaitPlaying: Story = {
  args: {
    ...faceAt(1),
    size: 'queue',
    wait: { kind: 'playing', courtLabel: 'Court 1', minutes: 4 },
  },
  decorators: queueDecorators,
}
export const WaitNotHere: Story = {
  args: { ...faceAt(2), size: 'queue', wait: { kind: 'not-here' } },
  decorators: queueDecorators,
}
export const WithSwap: Story = {
  args: {
    ...faceAt(0),
    size: 'queue',
    swap: { team: 'A', index: 0, onSwap: fn() },
  },
  decorators: queueDecorators,
}
export const Phone: Story = {
  args: { ...faceAt(0), size: 'queue' },
  decorators: queueDecorators,
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

// Club-facing face names (D-2026-11-26-09): the label, then the other names in smaller lines.
const named = (
  name: string,
  nickname: string | null,
  clubNickname: string | null,
): Story['args'] => ({
  ...faceAt(0),
  name,
  shortName: nickname ?? name.split(' ')[0] ?? name,
  nickname,
  clubNickname,
  label: `${name}, Team A. View profile`,
})

/** Club nickname over nickname over full name (dark pill on a court) */
export const FaceClubNickname: Story = { args: named('Miguel Santos', 'Migs', 'Kuya Migs') }
/** Nickname only: the nickname over the full name */
export const FaceNicknameOnly: Story = { args: named('Paulo Garcia', 'Pau', null) }
/** No nicknames: the first name over the full name */
export const FaceNoNicknames: Story = { args: named('Ysa Fernandez', null, null) }
export const FaceClubNicknameLight: Story = { ...FaceClubNickname, globals: { theme: 'light' } }
export const FaceNoNicknamesLight: Story = { ...FaceNoNicknames, globals: { theme: 'light' } }
/** On a queue card: plain text lines under the picture */
export const QueueFaceClubNickname: Story = {
  args: { ...named('Miguel Santos', 'Migs', 'Kuya Migs'), size: 'queue' },
  decorators: queueDecorators,
}
export const QueueFaceNoNicknames: Story = {
  args: { ...named('Ysa Fernandez', null, null), size: 'queue' },
  decorators: queueDecorators,
}
export const QueueFaceLight: Story = { ...QueueFaceClubNickname, globals: { theme: 'light' } }
