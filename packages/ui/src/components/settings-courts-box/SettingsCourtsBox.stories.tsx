import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  SettingsCourtsBox,
  type SettingsCourtsBoxCourt,
  type SettingsCourtsBoxProps,
} from './SettingsCourtsBox'

const at = (hour: number, minute = 0) => new Date(2026, 10, 24, hour, minute).getTime()
const player = (id: string, name: string): CourtPlayer => ({
  id,
  name,
  shortName: name.split(' ')[0] ?? name,
  level: 'intermediate_mid',
})
const teamA = [player('a1', 'Mikee Santos'), player('a2', 'Dexter Cruz')]
const teamB = [player('b1', 'Jose Reyes'), player('b2', 'Anna Lim')]

const SESSION_END = at(21)
const NOW = at(19, 40)

const court = (
  n: number,
  overrides: Partial<SettingsCourtsBoxCourt> = {},
): SettingsCourtsBoxCourt => ({
  id: `court-${n}`,
  label: `Court ${n}`,
  state: 'free',
  from: at(18),
  until: SESSION_END,
  followsSessionEnd: true,
  ...overrides,
})

const states: Partial<SettingsCourtsBoxCourt>[] = [
  { state: 'playing', teamA, teamB },
  { state: 'getting-ready', teamA, teamB },
  { state: 'free', followsSessionEnd: false, until: at(22, 15) },
  { state: 'not-open', from: at(20, 30) },
  { state: 'free' },
  { state: 'playing', teamA, teamB },
]
const courts = (count: number) =>
  Array.from({ length: count }, (_, i) => court(i + 1, states[i]))

/** Keeps the courts in state so a time edit or an added court re-renders like the Settings tab. */
function Stateful(args: SettingsCourtsBoxProps) {
  const [list, setList] = useState(args.courts)
  const patch = (id: string, change: Partial<SettingsCourtsBoxCourt>) =>
    setList((all) => all.map((c) => (c.id === id ? { ...c, ...change } : c)))
  return (
    <SettingsCourtsBox
      {...args}
      courts={list.map((c) => (c.followsSessionEnd ? { ...c, until: args.sessionEnd } : c))}
      onChangeFrom={(id, from) => patch(id, { from })}
      onChangeUntil={(id, until) => patch(id, { until, followsSessionEnd: false })}
      onFollowSessionEnd={(id) => patch(id, { followsSessionEnd: true })}
      onAddCourt={() => {
        args.onAddCourt()
        setList((all) => [...all, court(all.length + 1)])
      }}
    />
  )
}

const meta = {
  title: 'Queue/SettingsCourtsBox',
  component: SettingsCourtsBox,
  args: {
    courts: courts(4),
    sessionEnd: SESSION_END,
    now: NOW,
    onChangeFrom: fn(),
    onChangeUntil: fn(),
    onFollowSessionEnd: fn(),
    onExtend: fn(),
    onAddCourt: fn(),
  },
  render: (args) => <Stateful {...args} />,
} satisfies Meta<typeof SettingsCourtsBox>

export default meta
type Story = StoryObj<typeof meta>

const desktop = { viewport: { value: 'desktop' } }

export const TwoCourts: Story = { args: { courts: courts(2) } }
export const ThreeCourts: Story = { args: { courts: courts(3) } }
export const FourCourts: Story = { args: { courts: courts(4) } }
export const SixCourts: Story = { args: { courts: courts(6) }, globals: desktop }
/** Planned end passed: the header line is in the warning colour. */
export const PlannedEndPassed: Story = { args: { now: at(21, 15) } }
/** 375 px: one court a slide at 86%, dots under it; Add court is the last slide. */
export const PhoneSlider: Story = {
  args: { courts: courts(4) },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { args: { courts: courts(4) }, globals: desktop }
export const TwoCourtsLight: Story = { args: { courts: courts(2) }, globals: { theme: 'light' } }
export const FourCourtsLight: Story = { args: { courts: courts(4) }, globals: { theme: 'light' } }
export const SixCourtsLight: Story = {
  args: { courts: courts(6) },
  globals: { theme: 'light', ...desktop },
}
export const PlannedEndPassedLight: Story = {
  args: { now: at(21, 15) },
  globals: { theme: 'light' },
}
export const PhoneSliderLight: Story = {
  args: { courts: courts(4) },
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
