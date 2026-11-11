import { clubPlayers } from '@rotra/data/fixtures/players'
import { levelLabel } from '@rotra/ui/level-pill'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { type ClubMemberBand, ClubMemberList, type ClubMemberListRow } from './ClubMemberList'

const mask = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w[0]}***`)
    .join(' ')
const all: (ClubMemberListRow & { band: ClubMemberBand })[] = clubPlayers
  .filter((p) => p.clubId === clubPlayers[0]?.clubId)
  .map((p, i) => ({
    key: p.id,
    name: i === 3 ? mask(p.fullName) : p.fullName,
    levelLabel: levelLabel(p.playingLevel),
    band: (p.playingLevel?.split('_')[0] as ClubMemberBand | undefined) ?? 'none',
    isYou: i === 0,
    openable: i !== 3,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

function Live({ masked = false }: { masked?: boolean }) {
  const [query, setQuery] = useState('')
  const [band, setBand] = useState<ClubMemberBand>('all')
  const source = masked
    ? all.map((r) => ({ ...r, name: mask(r.name), isYou: false, openable: false }))
    : all
  const q = query.trim().toLowerCase()
  const rows = source.filter(
    (r) =>
      (!q || (r.openable && r.name.toLowerCase().includes(q))) &&
      (band === 'all' || r.band === band),
  )
  return (
    <div className="flex max-w-[920px] flex-col gap-5">
      <ClubMemberList
        rows={rows}
        totalCount={source.length}
        query={query}
        band={band}
        onQueryChange={setQuery}
        onBandChange={setBand}
        onClear={() => {
          setQuery('')
          setBand('all')
        }}
        onOpen={fn()}
      />
    </div>
  )
}

const meta = {
  title: 'Player/ClubMemberList',
  component: ClubMemberList,
  args: {
    rows: all,
    totalCount: all.length,
    query: '',
    band: 'all',
    onQueryChange: fn(),
    onBandChange: fn(),
    onClear: fn(),
    onOpen: fn(),
  },
} satisfies Meta<typeof ClubMemberList>
export default meta
type Story = StoryObj<typeof meta>
/** Signed in: names, You on the own row; one always-private member stays masked with no button. */
export const SignedIn: Story = { render: () => <Live /> }
export const SignedOut: Story = { render: () => <Live masked /> }
export const Filtered: Story = {
  args: { rows: all.filter((r) => r.band === 'advanced'), band: 'advanced' },
}
export const NoMatch: Story = { args: { rows: [], query: 'zzz' } }
export const Phone: Story = { render: () => <Live />, globals: { viewport: { value: 'phone' } } }
export const SignedInLight: Story = { render: () => <Live />, globals: { theme: 'light' } }
export const NoMatchLight: Story = { ...NoMatch, globals: { theme: 'light' } }
