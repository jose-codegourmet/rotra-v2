import { PLAYING_LEVELS } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn, within } from 'storybook/test'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { type SwapPickerPlayer, SwapPickerSheet, type SwapPickerSheetProps } from './SwapPickerSheet'

const NAMES = [
  'Mikee Abellana',
  'Dexter Ramos',
  'Jose Buctuanon',
  'Raymark Cruz',
  'Nathan Lim',
  'Gus Santos',
  'Hal Reyes',
  'Ivy Tan',
  'Joy Dela Cruz',
  'Kai Mendoza',
  'Lea Uy',
  'Migs Bautista',
  'Nina Go',
  'Oscar Lee',
  'Pia Chua',
  'Quinn Sy',
  'Rina Ong',
  'Sam Yap',
  'Tess Lao',
  'Ugo Lim',
  'Vic Tan',
  'Wes Ang',
  'Xia Co',
  'Yna Dy',
  'Zed Ko',
  'Abby Sia',
  'Ben Que',
  'Cara Lu',
  'Dan Ty',
  'Eve Po',
]
const STATUSES: SwapPickerPlayer['status'][] = ['free', 'free', 'free', 'away', 'playing', 'free']
const roster: SwapPickerPlayer[] = NAMES.map((name, i) => ({
  id: `p${i}`,
  name,
  shortName: name.split(' ')[0] ?? name,
  level: PLAYING_LEVELS[i % PLAYING_LEVELS.length] ?? null,
  games: i % 4,
  restMinutes: (i * 7) % 23,
  status: STATUSES[i % STATUSES.length] ?? 'free',
}))
const inMatch = roster.slice(0, 4).map((p, i) => ({
  ...p,
  status: 'playing' as const,
  team: i < 2 ? ('A' as const) : ('B' as const),
}))
const others = roster.slice(4)

function Stateful(args: SwapPickerSheetProps) {
  const [outId, setOut] = useState(args.outId)
  const [inId, setIn] = useState(args.inId)
  return (
    <SwapPickerSheet
      {...args}
      outId={outId}
      inId={inId}
      onPickOut={setOut}
      onPickIn={setIn}
      action={
        <Button variant="primary" disabled={!outId || !inId}>
          Replace player
        </Button>
      }
    />
  )
}

const meta = {
  title: 'Queue/SwapPickerSheet',
  component: SwapPickerSheet,
  render: (args) => <Stateful {...args} />,
  args: {
    open: true,
    matchNo: 7,
    title: 'Replace a player in match 7',
    outLabel: "Who's coming out?",
    inMatch,
    players: others,
    minimumGames: 4,
    outId: 'p0',
    inId: null,
    onPickOut: fn(),
    onPickIn: fn(),
    onBack: fn(),
    action: null,
    extra: (
      <Notice tone="info">
        <b>Replace fixes a mistake.</b> Use it when the wrong player was put in this match.
      </Notice>
    ),
  },
} satisfies Meta<typeof SwapPickerSheet>

export default meta
type Story = StoryObj<typeof meta>

// The sheet is portaled to <body>, outside the story root.
const openOther: Story['play'] = async ({ canvasElement, userEvent }) => {
  const body = within(canvasElement.ownerDocument.body)
  await userEvent.click(await body.findByRole('button', { name: /Other/ }))
}

/** Compact: Who's coming out, Suggested with the Other tile, the notice and the action */
export const Compact: Story = {}
/** 900 px and wider: Other widens the dialog and shows All players on the right */
export const Expanded: Story = { play: openOther }
export const ExpandedLight: Story = { play: openOther, globals: { theme: 'light' } }
/** Under 900 px: All players opens as a second dialog stacked over the picker */
export const PhoneStacked: Story = { play: openOther, globals: { viewport: { value: 'phone' } } }
export const NoFreePlayer: Story = {
  args: { players: others.map((p) => ({ ...p, status: 'away' as const })) },
}
export const Substitute: Story = {
  args: {
    title: 'Substitute in match 7',
    outLabel: "Who's coming off?",
    extra: <p className="m-0 text-[13px] text-fg2">Who gets this game? (credit choice)</p>,
  },
}
export const SomethingChanged: Story = {
  args: { message: 'Something changed. Review the match again.' },
}
