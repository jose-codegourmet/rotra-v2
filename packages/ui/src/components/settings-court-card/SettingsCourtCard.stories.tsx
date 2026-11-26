import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SettingsCourtCard, type SettingsCourtCardProps } from './SettingsCourtCard'

const at = (hour: number, minute = 0) => new Date(2026, 10, 24, hour, minute).getTime()
const player = (id: string, name: string): CourtPlayer => ({
  id,
  name,
  shortName: name.split(' ')[0] ?? name,
  level: 'intermediate_mid',
})
const teamA = [player('a1', 'Mikee Santos'), player('a2', 'Dexter Cruz')]
const teamB = [player('b1', 'Jose Reyes'), player('b2', 'Anna Lim')]

const base = {
  label: 'Court 1',
  state: 'free',
  from: at(18),
  until: at(21),
  sessionEnd: at(21),
  followsSessionEnd: true,
  onChangeFrom: fn(),
  onChangeUntil: fn(),
  onFollowSessionEnd: fn(),
  onRename: fn(),
} satisfies SettingsCourtCardProps

const NOW = at(19, 40)
/** Timers against a fixed now: "Playing · 14 min", "Free · 6 min", "Free · 1 h 5 min". */
const playingTimer = { state: 'playing', teamA, teamB, playingSince: at(19, 26), now: NOW } as const
const freeTimer = { state: 'free', freeSince: at(19, 34), now: NOW } as const

/** Keeps the times and the checkbox in state so the story behaves like the Settings tab. */
function Stateful(args: SettingsCourtCardProps) {
  const [from, setFrom] = useState(args.from)
  const [until, setUntil] = useState(args.until)
  const [follows, setFollows] = useState(args.followsSessionEnd)
  return (
    <div className="w-full max-w-[380px]">
      <SettingsCourtCard
        {...args}
        from={from}
        until={follows ? args.sessionEnd : until}
        followsSessionEnd={follows}
        onChangeFrom={(next) => {
          setFrom(next)
          args.onChangeFrom(next)
        }}
        onChangeUntil={(next) => {
          setUntil(next)
          setFollows(false)
          args.onChangeUntil(next)
        }}
        onFollowSessionEnd={() => {
          setFollows(true)
          args.onFollowSessionEnd()
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Queue/SettingsCourtCard',
  component: SettingsCourtCard,
  args: base,
  render: (args) => <Stateful {...args} />,
} satisfies Meta<typeof SettingsCourtCard>

export default meta
type Story = StoryObj<typeof meta>

export const Free: Story = {}
export const GettingReady: Story = { args: { state: 'getting-ready', teamA, teamB } }
export const Playing: Story = { args: { state: 'playing', teamA, teamB } }
export const NotOpenYet: Story = { args: { state: 'not-open', from: at(19, 30) } }
export const FollowsOn: Story = {}
export const FollowsOff: Story = {
  args: { followsSessionEnd: false, until: at(22, 15) },
}
/** Until falls after midnight: the field shows "next day". */
export const NextDay: Story = {
  args: { followsSessionEnd: false, from: at(22), until: new Date(2026, 10, 25, 1).getTime() },
}
/** From at or after Until: the field is flagged and the refusal shows under it. */
export const InvalidFrom: Story = {
  args: { followsSessionEnd: false, from: at(21, 30), until: at(21) },
}
/** The chip timers: "Playing · 14 min" from the match start. */
export const PlayingTimer: Story = { args: playingTimer }
/** "Free · 6 min" from the court's open moment or its last match's end. */
export const FreeTimer: Story = { args: freeTimer }
/** An hour or more: "Free · 1 h 5 min". */
export const FreeTimerHours: Story = { args: { ...freeTimer, freeSince: at(18, 35) } }
/** The ⠿ handle before the label (the box attaches the drag and arrow-key handlers). */
export const WithHandle: Story = { args: { ...playingTimer, handleProps: {} } }
export const PlayingTimerLight: Story = { args: playingTimer, globals: { theme: 'light' } }
export const FreeTimerLight: Story = { args: freeTimer, globals: { theme: 'light' } }
export const WithHandleLight: Story = {
  args: { ...playingTimer, handleProps: {} },
  globals: { theme: 'light' },
}
export const PlayingLight: Story = {
  args: { state: 'playing', teamA, teamB },
  globals: { theme: 'light' },
}
export const FreeLight: Story = { globals: { theme: 'light' } }
export const NextDayLight: Story = {
  args: { followsSessionEnd: false, from: at(22), until: new Date(2026, 10, 25, 1).getTime() },
  globals: { theme: 'light' },
}
export const InvalidFromLight: Story = {
  args: { followsSessionEnd: false, from: at(21, 30), until: at(21) },
  globals: { theme: 'light' },
}
export const Phone: Story = {
  args: { state: 'playing', teamA, teamB },
  globals: { viewport: { value: 'phone' } },
}
