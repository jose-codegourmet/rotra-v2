import { joseGame, joseSession } from '@rotra/data/fixtures/player-games'
import type { MatchPage as MatchPageData, MatchPagePlayer } from '@rotra/data/match-page/types'
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
): MatchPagePlayer => ({
  playerId,
  name,
  picture: null,
  skillGroup,
  sessionGameNumber: earlierGames.length + 1,
  counting: 'counted',
  earlierGames,
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
    player('J*** R***', 'jasper', null),
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

/** A visitor: Team A on the left with first names, no share icon. */
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
/** A fun game: “Fun game · not counted” under the court, no Won / Lost rings. */
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
/** First game of the night and the session page gone: every block “No earlier games”, plain title. */
export const FirstGameExpiredPage: Story = {
  args: {
    page: {
      ...page,
      session: { ...page.session, sessionPageUrl: null },
      teamA: page.teamA.map((p) => ({ ...p, earlierGames: [], sessionGameNumber: 1 })),
      teamB: page.teamB.map((p) => ({ ...p, earlierGames: [], sessionGameNumber: 1 })),
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
