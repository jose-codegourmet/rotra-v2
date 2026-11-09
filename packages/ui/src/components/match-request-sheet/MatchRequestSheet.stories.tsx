import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import { countedGames, shortName } from '@rotra/data/match/match.rules'
import type { MatchFormat } from '@rotra/data/match/types'
import { REQUEST_FORMAT_ORDER, requestSpots } from '@rotra/data/match-request/rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { MatchRequestSheet, type MatchRequestSheetProps } from './MatchRequestSheet'

const { roster, matches, session } = consoleSessionFixture
const [viewerRow, ...others] = roster.filter((p) => p.present)
if (!viewerRow) throw new Error('Console fixture has no present players')

const viewer = { name: viewerRow.nameSnapshot }
const players = others.map((p) => ({
  id: p.id,
  name: p.nameSnapshot,
  shortName: shortName(p),
  level: p.level,
  games: countedGames(p.id, matches),
}))
const id = (i: number) => players[i]?.id ?? null

const ALL = REQUEST_FORMAT_ORDER
const filled = (format: MatchFormat, picks: (string | null)[] = []) => {
  const { partners, opponents } = requestSpots(format)
  return {
    partners: Array.from({ length: partners }, (_, i) => picks[i] ?? null),
    opponents: Array.from({ length: opponents }, (_, i) => picks[partners + i] ?? null),
  }
}

type Args = Omit<MatchRequestSheetProps, 'onFormatChange' | 'partners' | 'opponents'> &
  Partial<Pick<MatchRequestSheetProps, 'partners' | 'opponents'>>

/** Holds the format and the spots so the pills and the clear buttons work in Storybook. */
function Stateful({ partners, opponents, format: initial, ...props }: Args) {
  const [format, setFormat] = useState(initial)
  const [spots, setSpots] = useState({ partners, opponents })
  const fit = (f: MatchFormat) => {
    const next = requestSpots(f)
    return {
      partners: Array.from({ length: next.partners }, (_, i) => spots.partners?.[i] ?? null),
      opponents: Array.from({ length: next.opponents }, (_, i) => spots.opponents?.[i] ?? null),
    }
  }
  const shown = fit(format)
  return (
    <MatchRequestSheet
      {...props}
      format={format}
      partners={shown.partners}
      opponents={shown.opponents}
      onFormatChange={(f) => {
        setSpots(fit(f))
        setFormat(f)
      }}
      onClearSpot={({ side, index }) => {
        const key = side === 'partner' ? 'partners' : 'opponents'
        setSpots({ ...shown, [key]: shown[key].map((v, i) => (i === index ? null : v)) })
      }}
    />
  )
}

const meta = {
  title: 'Queue/MatchRequestSheet',
  component: Stateful,
  args: {
    open: true,
    onOpenChange: fn(),
    viewer,
    players,
    minimumGames: session.minimumGames,
    allowedFormats: ALL,
    format: 'doubles',
    ...filled('doubles'),
    onPickSpot: fn(),
    onClearSpot: fn(),
    onCancel: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Stateful>

export default meta
type Story = StoryObj<typeof meta>

/** All six formats allowed; 2 v 2 with every spot Anyone */
export const DoublesAllAnyone: Story = {}

/** One partner picked: the picture and short name on the court, and the row under it */
export const PartnerPicked: Story = { args: { ...filled('doubles', [id(0)]) } }

/** Partner and both opponents picked */
export const AllThreePicked: Story = { args: { ...filled('doubles', [id(0), id(1), id(2)]) } }

/** 1 v 1: You on the left, one Opponent on the right */
export const Singles: Story = { args: { format: 'singles', ...filled('singles') } }
export const SinglesPicked: Story = { args: { format: 'singles', ...filled('singles', [id(1)]) } }

/** 1 v 2: You alone against two */
export const OneVersusTwo: Story = { args: { format: 'fun_1v2', ...filled('fun_1v2') } }
export const OneVersusTwoPicked: Story = {
  args: { format: 'fun_1v2', ...filled('fun_1v2', [id(0), id(2)]) },
}

export const ThreeVersusThree: Story = { args: { format: 'fun_3v3', ...filled('fun_3v3') } }
export const ThreeVersusThreePicked: Story = {
  args: { format: 'fun_3v3', ...filled('fun_3v3', [id(0), id(1), id(2), null, id(3)]) },
}

/** 4 v 4 and 5 v 5 draw on the taller court */
export const FourVersusFour: Story = { args: { format: 'fun_4v4', ...filled('fun_4v4') } }
export const FourVersusFourPicked: Story = {
  args: {
    format: 'fun_4v4',
    ...filled('fun_4v4', [id(0), id(1), null, id(2), id(3), null, id(4)]),
  },
}
export const FiveVersusFive: Story = { args: { format: 'fun_5v5', ...filled('fun_5v5') } }
export const FiveVersusFivePicked: Story = {
  args: {
    format: 'fun_5v5',
    ...filled('fun_5v5', [id(0), id(1), id(2), null, id(3), id(4), null, id(5)]),
  },
}

/** Some formats off: greyed, struck through, with the hint under the pills */
export const SomeFormatsDisabled: Story = {
  args: { allowedFormats: ['doubles', 'singles', 'fun_3v3'] },
}

/** Only 1 v 1 is on: it is the selected pill */
export const OnlySingles: Story = {
  args: { allowedFormats: ['singles'], format: 'singles', ...filled('singles') },
}

/** No format allowed: every pill greyed; Send request still calls onSend and the app toasts */
export const NoFormatAllowed: Story = { args: { allowedFormats: [] } }

/** Send request in flight */
export const Sending: Story = { args: { isPending: true, ...filled('doubles', [id(0)]) } }

/** A failed send */
export const SendFailed: Story = { args: { error: 'Could not send the request. Try again.' } }
