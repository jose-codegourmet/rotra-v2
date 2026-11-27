import { joseGame } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GameRow } from './GameRow'

const you = { name: 'Jose Buctuanon', label: 'You', playerId: 'jose' }
const withFaces = (session: number, index: number) => {
  const game = joseGame(session, index)
  return {
    ...game,
    sessionGameNumber: index + 1,
    partnerPlayers: game.partners.map((name, i) => ({
      name,
      picture: null,
      playerId: null,
      sessionGameNumber: index + 2 + i,
    })),
    opponentPlayers: game.opponents.map((name, i) => ({
      name,
      picture: null,
      playerId: i === 0 ? `p-${name}` : null,
      sessionGameNumber: index + 1 + i,
    })),
  }
}
const meta = {
  title: 'Player/GameRow',
  component: GameRow,
  args: { game: withFaces(0, 0), me: you, onOpenPlayer: () => {} },
} satisfies Meta<typeof GameRow>
export default meta
type Story = StoryObj<typeof meta>
export const WonWithScore: Story = { globals: { theme: 'dark' } }
export const WonWithScoreLight: Story = { globals: { theme: 'light' } }
export const OwnGameShareable: Story = { args: { onShare: () => {} }, globals: { theme: 'dark' } }
export const LostWithoutScore: Story = { args: { game: withFaces(0, 1) } }
export const Singles: Story = { args: { game: withFaces(0, 2) } }
export const Fun: Story = { args: { game: withFaces(0, 3) } }
export const PartialWithNote: Story = { args: { game: withFaces(3, 2) } }
/** A game of a not ranked session: Won / Lost as usual, the note without “· not counted”. */
export const NotRanked: Story = {
  args: { game: withFaces(2, 0), onShare: () => {} },
  globals: { theme: 'dark' },
}
export const NotRankedLight: Story = { ...NotRanked, globals: { theme: 'light' } }
export const NotRankedPhone: Story = {
  ...NotRanked,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const SomeoneElse: Story = {
  args: { me: { name: 'Mikee Abellana', label: 'Mikee', playerId: 'mikee' } },
}
/** No per-player detail (real mode for now): only the owner's face opens a card. */
export const NamesOnly: Story = { args: { game: joseGame(0, 0) } }
export const WithDateLine: Story = {
  args: { dateLine: 'Sunday Night Queue · Sun, Oct 26 · Lahug Smash Club' },
}
export const Phone: Story = {
  args: { onShare: () => {} },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const PhoneLight: Story = {
  args: { onShare: () => {} },
  globals: { theme: 'light', viewport: { value: 'phone' } },
}

/** Best of 3 (Q22): "2–1" and every game score in a pill under the format pill. */
export const BestOfThreeGames: Story = {
  args: { game: { ...withFaces(0, 0), score: '2–1', gameScores: ['21–18', '15–21', '21–19'] } },
}
export const BestOfThreeGamesLight: Story = { ...BestOfThreeGames, globals: { theme: 'light' } }

/** Court tap (2026-11-25 match page log): the court box opens the game's match page. */
export const OpensMatchPage: Story = {
  args: { onShare: () => {}, onOpen: () => {} },
  globals: { theme: 'dark' },
}
export const OpensMatchPageLight: Story = { ...OpensMatchPage, globals: { theme: 'light' } }
/** The match page court: skill-group rings on every face, no court tap. */
export const SkillRings: Story = {
  args: {
    skillRings: (player) =>
      player.playerId === 'jose' ? 'intermediate' : player.playerId ? 'advanced' : null,
  },
  globals: { theme: 'dark' },
}
export const SkillRingsLight: Story = { ...SkillRings, globals: { theme: 'light' } }

/**
 * Win chance (D-2026-11-27-03): “41% · 59%” after the format, left side first; display only in a
 * list, where the court still opens the Game page.
 */
export const WinChance: Story = {
  args: {
    game: {
      ...withFaces(0, 0),
      winChance: { a: 41, b: 59, favored: 'B', strong: false },
      upset: false,
    },
    onOpen: () => {},
  },
  globals: { theme: 'dark' },
}
export const WinChanceLight: Story = { ...WinChance, globals: { theme: 'light' } }
/** The Favored side (65% or more) lost: the Upset pill follows. */
export const WinChanceUpset: Story = {
  args: {
    game: {
      ...withFaces(0, 0),
      winChance: { a: 27, b: 73, favored: 'B', strong: true },
      upset: true,
    },
    onOpen: () => {},
  },
  globals: { theme: 'dark' },
}
export const WinChanceUpsetLight: Story = { ...WinChanceUpset, globals: { theme: 'light' } }
export const WinChanceUpsetPhone: Story = {
  ...WinChanceUpset,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
/** The Game page court: both pills are buttons that open the Win chance dialog. */
export const WinChanceOpensDialog: Story = {
  args: { ...WinChanceUpset.args, onOpen: undefined, onOpenWinChance: () => {} },
  globals: { theme: 'dark' },
}
export const WinChanceOpensDialogLight: Story = {
  ...WinChanceOpensDialog,
  globals: { theme: 'light' },
}
