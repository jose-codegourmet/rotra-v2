import type {
  WinChanceBreakdown,
  WinChancePlayerBreakdown,
  WinChanceRow,
} from '@rotra/data/match/win-chance'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { WinChanceDialog, type WinChanceDialogPlayer } from './WinChanceDialog'

const players: Record<string, WinChanceDialogPlayer> = {
  p1: { name: 'Marco Dela Cruz', shortName: 'Marco' },
  p2: { name: 'Iya Santos', shortName: 'Iya' },
  p3: { name: 'Pau Reyes', shortName: 'Pau' },
  p4: { name: 'Ysa Lim', shortName: 'Ysa' },
  g1: { name: 'Guest Kuya', shortName: 'Guest' },
}

const row = (key: WinChanceRow['key'], label: string, detail: string, value: number) => ({
  key,
  label,
  detail,
  value,
})

const live = (id: string, level: number, extra: number): WinChancePlayerBreakdown => {
  const rows = [
    row('level', 'Level', 'Intermediate 2', level),
    row('club_win_rate', 'Club win rate', '58% of 24 games', 0.24),
    row('best_day', 'Best day', 'Fridays', 0),
    row('leaderboard_place', 'Leaderboard', '3rd of 40', 0.12),
    row('tonight', 'Tonight', '2 wins, 0 losses', extra),
    row('in_row', 'In a row', '2 wins in a row', 0.15),
    row('handicap', 'Handicap', '2 spots', -0.5),
  ]
  const rating = rows.reduce((sum, r) => sum + r.value, 0)
  return { id, rows, rating }
}

const lasting = (id: string, level: number): WinChancePlayerBreakdown => {
  const rows = [
    row('level', 'Level', 'Intermediate 2', level),
    row('club_win_rate', 'Club win rate', '50%, no record yet', 0),
    row('best_day', 'Best day', 'Not enough games', 0),
  ]
  return { id, rows, rating: level }
}

const base: WinChanceBreakdown = {
  chance: { a: 39, b: 61, favored: 'B', strong: false },
  teamA: { players: [live('p3', 4, -0.1), live('p4', 4, 0.31)], average: 4.3 },
  teamB: { players: [live('p1', 5, 0.24), live('p2', 4, 0)], average: 4.6 },
  lasting: false,
  upset: false,
}

const meta = {
  title: 'Queue/WinChanceDialog',
  component: WinChanceDialog,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onClose: fn(), breakdown: base, players },
} satisfies Meta<typeof WinChanceDialog>

export default meta
type Story = StoryObj<typeof meta>

/** A live match with every kind of row; the stronger pair is not yet Favored. */
export const LiveMatch: Story = {}
export const Favored: Story = {
  args: { breakdown: { ...base, chance: { a: 27, b: 73, favored: 'B', strong: true } } },
}
export const Even: Story = {
  args: { breakdown: { ...base, chance: { a: 52, b: 48, favored: null, strong: false } } },
}
/** A finished Upset: the Favored pair lost; read from the lasting signals only. */
export const FinishedUpset: Story = {
  args: {
    breakdown: {
      chance: { a: 31, b: 69, favored: 'B', strong: true },
      teamA: { players: [lasting('p3', 4), lasting('p4', 4)], average: 4 },
      teamB: { players: [lasting('p1', 5), lasting('p2', 5)], average: 5 },
      lasting: true,
      upset: true,
    },
  },
}
export const GuestPair: Story = {
  args: {
    breakdown: {
      ...base,
      teamA: { players: [lasting('g1', 3), lasting('missing', 4)], average: 3.5 },
    },
  },
}
export const LongNames: Story = {
  args: {
    players: {
      ...players,
      p1: { name: 'Maria Cristina Alessandra Dela Cruz-Villanueva', shortName: 'Maria Cristina' },
      p3: { name: 'Bartholomew Montgomery-Fitzgerald', shortName: 'Bartholomew' },
    },
  },
}
export const Phone375: Story = {
  globals: { viewport: { value: 'phone' } },
}
export const Light: Story = { globals: { theme: 'light' } }
