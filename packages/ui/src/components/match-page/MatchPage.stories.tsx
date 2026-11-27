import { joseGame, joseSession } from '@rotra/data/fixtures/player-games'
import { sampleForm } from '@rotra/data/match/win-chance'
import type { MatchPage as MatchPageData, MatchPagePlayer } from '@rotra/data/match-page/types'
import { gameWinChanceBreakdown } from '@rotra/data/player/game-win-chance'
import type { PlayerGame, PlayerGamePlayer } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MatchPage } from './MatchPage'

// The mock read's sample: Jose's second game of Sunday Night Queue (`recorded-game-1`).
const session = joseSession(0)
const first = joseGame(0, 0)
const match = joseGame(0, 1)
const person = (name: string, playerId: string | null, n: number): PlayerGamePlayer => ({
  name,
  picture: null,
  playerId,
  sessionGameNumber: n,
})
const earlier = (
  game: PlayerGame,
  partners: PlayerGamePlayer[],
  opponents: PlayerGamePlayer[],
) => ({
  ...game,
  sessionGameNumber: 1,
  partners: partners.map((p) => p.name),
  opponents: opponents.map((p) => p.name),
  partnerPlayers: partners,
  opponentPlayers: opponents,
})
const player = (
  name: string,
  playerId: string | null,
  skillGroup: MatchPagePlayer['skillGroup'],
  earlierGames: PlayerGame[] = [],
): MatchPagePlayer => {
  const wins = earlierGames.filter((game) => game.result === 'won').length
  const played = earlierGames.length
  return {
    playerId,
    name,
    picture: null,
    skillGroup,
    sessionGameNumber: played + 1,
    counting: 'counted',
    earlierGames,
    beforeGame: {
      played,
      wins,
      losses: played - wins,
      winRate: played ? Math.round((wins / played) * 100) : null,
    },
    yearWinRate: playerId && played ? 64 : null,
  }
}
const firstGamePlayer = (player: MatchPagePlayer): MatchPagePlayer => ({
  ...player,
  earlierGames: [],
  beforeGame: { played: 0, wins: 0, losses: 0, winRate: null },
  sessionGameNumber: 1,
})

const page: MatchPageData = {
  matchId: match.id,
  format: match.format,
  counting: 'counted',
  score: '18–21',
  winner: 'b',
  session: {
    id: session.id,
    title: session.title,
    clubName: session.clubName,
    finishedAt: session.finishedAt,
    sessionPageUrl: 'https://queue.rotra.example/s/sunday-night-queue',
    ranked: true,
  },
  teamA: [
    player('Jose Buctuanon', 'jose', 'intermediate', [
      earlier(
        first,
        [person('Aaron', null, 1)],
        [person('Gab', 'gab', 1), person('M*** A***', 'mikee', 1)],
      ),
    ]),
    player('Dalton', 'dalton', 'intermediate'),
  ],
  teamB: [
    player('Gab', 'gab', 'advanced', [
      {
        ...earlier(
          first,
          [person('M*** A***', 'mikee', 1)],
          [person('Jose Buctuanon', 'jose', 1), person('Aaron', null, 1)],
        ),
        result: 'lost',
        score: '18–21',
      },
    ]),
    { ...player('J*** R***', 'jasper', null), beforeGame: null },
  ],
  viewerPlayerId: null,
}

const meta = {
  title: 'Player/MatchPage',
  component: MatchPage,
  args: {
    matchId: match.id,
    page,
    backLabel: 'Leaderboard',
    onBack: () => {},
    onOpenPlayer: () => {},
    onOpenGame: () => {},
    onShareGame: () => {},
  },
} satisfies Meta<typeof MatchPage>
export default meta
type Story = StoryObj<typeof meta>

/** A visitor: Team A on the left, with no stats or share icon. */
export const Visitor: Story = { globals: { theme: 'dark' } }
export const VisitorLight: Story = { globals: { theme: 'light' } }
/** The signed-in player played: their side on the left as You, the share icon on their games. */
export const PlayedIn: Story = {
  args: { page: { ...page, viewerPlayerId: 'jose' }, backLabel: 'Jose Buctuanon' },
  globals: { theme: 'dark' },
}
export const PlayedInLight: Story = { ...PlayedIn, globals: { theme: 'light' } }
/** The viewer was on Team B: their side moves left, the score and result turn round. */
export const PlayedOnTeamB: Story = {
  args: { page: { ...page, viewerPlayerId: 'gab' }, backLabel: 'Games' },
  globals: { theme: 'dark' },
}
export const PlayedOnTeamBPhone: Story = {
  ...PlayedOnTeamB,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const PlayedOnTeamBPhoneLight: Story = {
  ...PlayedOnTeamB,
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
/** A fun game: “Fun game · not counted” under the court. */
export const FunGame: Story = {
  args: {
    page: {
      ...page,
      format: 'fun_3v3',
      counting: 'fun',
      teamA: page.teamA.map((p) => ({ ...p, counting: 'fun' as const })),
      teamB: page.teamB.map((p) => ({ ...p, counting: 'fun' as const })),
    },
  },
}
/** Partial for the left player: Not counted chip and their note. */
export const PartialGame: Story = {
  args: {
    page: {
      ...page,
      teamA: page.teamA.map((p, i) =>
        i === 0 ? { ...p, counting: 'partial' as const, note: 'Came in mid-game for Troy' } : p,
      ),
    },
  },
}
/** A session run with Record games off: the not ranked note. */
export const NotRanked: Story = {
  args: {
    page: {
      ...page,
      counting: 'not_ranked',
      session: { ...page.session, ranked: false },
      teamA: page.teamA.map((p) => ({ ...p, counting: 'not_ranked' as const })),
      teamB: page.teamB.map((p) => ({ ...p, counting: 'not_ranked' as const })),
    },
  },
}
/** First game of the night with an expired public session page. */
export const FirstGameExpiredPage: Story = {
  args: {
    page: {
      ...page,
      session: { ...page.session, sessionPageUrl: null },
      teamA: page.teamA.map(firstGamePlayer),
      teamB: page.teamB.map(firstGamePlayer),
    },
  },
}
export const Loading: Story = { args: { page: undefined }, globals: { theme: 'dark' } }
export const LoadingLight: Story = { args: { page: undefined }, globals: { theme: 'light' } }
export const ErrorLoading: Story = {
  args: { page: undefined, error: true, onRetry: () => {} },
}
export const NotFound: Story = {
  args: { page: null, matchId: 'no-such-game' },
  globals: { theme: 'dark' },
}
export const NotFoundLight: Story = { ...NotFound, globals: { theme: 'light' } }

export const PlayerPicked: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Jose Buctuanon, .*show stats/i }))
  },
  globals: { theme: 'dark' },
}
export const PlayerPickedLight: Story = { ...PlayerPicked, globals: { theme: 'light' } }

export const TeamPicked: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Won team: show stats/i }))
  },
  globals: { theme: 'dark' },
}
export const TeamPickedLight: Story = { ...TeamPicked, globals: { theme: 'light' } }

export const FirstGamePlayerPicked: Story = {
  ...FirstGameExpiredPage,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Dalton, .*show stats/i }))
  },
  globals: { theme: 'dark' },
}
export const FirstGamePlayerPickedLight: Story = {
  ...FirstGamePlayerPicked,
  globals: { theme: 'light' },
}

export const GuestPicked: Story = {
  args: {
    page: { ...page, teamA: [...page.teamA.slice(0, 1), player('A***', null, null)] },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'A***, Guest. Show stats' }))
  },
  globals: { theme: 'dark' },
}
export const GuestPickedLight: Story = { ...GuestPicked, globals: { theme: 'light' } }

export const MaskedPlayerPicked: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'J*** R***, No skill group shown. Show stats' }),
    )
  },
  globals: { theme: 'dark' },
}
export const MaskedPlayerPickedLight: Story = {
  ...MaskedPlayerPicked,
  globals: { theme: 'light' },
}

export const YourStatsPicked: Story = {
  ...PlayedIn,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^You, .*show stats/i }))
  },
}
export const YourStatsPickedLight: Story = { ...YourStatsPicked, globals: { theme: 'light' } }

// Sample lasting signals, as the mock read makes them; the masked player has no club record here.
const SUNDAY = 0
const winChance = (winner: 'left' | 'right', teamBLevel: 'intermediate_mid' | 'advanced_high') =>
  gameWinChanceBreakdown(
    'doubles',
    [
      { level: 'intermediate_mid', form: sampleForm('jose', SUNDAY) },
      { level: 'intermediate_low', form: sampleForm('dalton', SUNDAY) },
    ],
    [{ level: teamBLevel, form: sampleForm('gab', SUNDAY) }, { level: teamBLevel }],
    winner,
  ) ?? undefined

/**
 * Win chance (D-2026-11-27-03): the pill on the court and each team's percent beside Won / Lost;
 * all three open the Win chance dialog. A masked name stays masked in the dialog.
 */
export const WinChance: Story = {
  args: { page: { ...page, winChance: winChance('right', 'intermediate_mid') } },
  globals: { theme: 'dark' },
}
export const WinChanceLight: Story = { ...WinChance, globals: { theme: 'light' } }
export const WinChancePhone: Story = {
  ...WinChance,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
/** The viewer was on Team B: the percents turn round with the court. */
export const WinChanceOnTeamB: Story = {
  args: {
    page: { ...page, viewerPlayerId: 'gab', winChance: winChance('right', 'intermediate_mid') },
  },
  globals: { theme: 'dark' },
}
/** The Favored pair lost: the Upset pill on the court and the Upset chip in the dialog title. */
export const WinChanceUpset: Story = {
  args: { page: { ...page, winner: 'a', winChance: winChance('left', 'advanced_high') } },
  globals: { theme: 'dark' },
}
export const WinChanceUpsetLight: Story = { ...WinChanceUpset, globals: { theme: 'light' } }
export const WinChanceDialogOpen: Story = {
  ...WinChance,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /^Win chance \d+% · \d+%\. Explain/i }),
    )
  },
}
export const WinChanceDialogOpenLight: Story = {
  ...WinChanceDialogOpen,
  globals: { theme: 'light' },
}
