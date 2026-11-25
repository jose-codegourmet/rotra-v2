import { Icon } from '@rotra/ui/icon'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MatchCourt, type MatchCourtPlayer } from './MatchCourt'

const face = (name: string, label = name.split(' ')[0] ?? name): MatchCourtPlayer => ({
  key: name,
  name,
  label,
  onOpen: () => {},
})
const meta = {
  title: 'Queue/MatchCourt',
  component: MatchCourt,
  args: {
    number: 12,
    timeLabel: '8:10–8:31 PM',
    left: [face('Jose Buctuanon', 'You'), face('Maya Santos')],
    right: [face('Ben Cruz'), face('Y*** R***')],
    winner: 'left',
    score: '21–17',
    mine: true,
  },
} satisfies Meta<typeof MatchCourt>
export default meta
type Story = StoryObj<typeof meta>

export const YourWin: Story = { globals: { theme: 'dark' } }
export const YourWinLight: Story = { globals: { theme: 'light' } }
export const YourLossNoScore: Story = { args: { winner: 'right', score: null } }
export const OtherMatchRightWon: Story = { args: { mine: false, winner: 'right', score: '15–21' } }
export const OnCourtNow: Story = { args: { mine: false, now: true } }
export const FunSingles: Story = {
  args: { fun: true, left: [face('Ben Cruz')], right: [face('Maya Santos')], mine: false },
}
export const Invalid: Story = { args: { invalid: true, winner: null, score: null } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }

/** Player variant (GameRow): the format pill, a share action top-right, a date line. */
export const PlayerVariant: Story = {
  args: {
    cornerLabel: 'Doubles',
    left: [
      { ...face('Jose Buctuanon', 'You'), badge: 4 },
      { ...face('Maya Santos'), badge: 2 },
    ],
    right: [
      { ...face('Ben Cruz'), badge: 5 },
      { ...face('Y*** R***'), badge: 1 },
    ],
    ariaLabel: 'Doubles: You and Maya versus Ben and Y',
    action: (
      <button
        type="button"
        aria-label="Share this game"
        className="absolute top-1.5 right-1.5 z-2 grid size-[30px] place-items-center rounded-full border-0 bg-court-level-label p-0 text-on-photo"
      >
        <Icon name="share" size={14} />
      </button>
    ),
    dateLine: 'Sunday Night Queue · Sun, Oct 26 · Lahug Smash Club',
  },
  globals: { theme: 'dark' },
}
export const PlayerVariantLight: Story = {
  args: PlayerVariant.args,
  globals: { theme: 'light' },
}
export const PlayerNotCountedWithNote: Story = {
  args: { cornerLabel: 'Doubles', notCounted: true, note: 'Partner left early' },
}
export const PlayerVariantPhone: Story = {
  args: {
    cornerLabel: 'Singles',
    left: [{ ...face('Jose Buctuanon', 'You'), badge: 3 }],
    right: [{ ...face('Ben Cruz'), badge: 2 }],
  },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}

/** Best of 3 (Q22): "2–1" in the score box, every game score in a pill under the match pill. */
export const BestOfThreeGames: Story = {
  args: { score: '2–1', gameScores: ['21–18', '15–21', '21–19'] },
}
export const BestOfThreeGamesLight: Story = { ...BestOfThreeGames, globals: { theme: 'light' } }
export const BestOfThreeTwoGames: Story = {
  args: { score: '2–0', gameScores: ['21–18', '21–15'], mine: false },
}
export const BestOfThreePhone: Story = {
  ...BestOfThreeGames,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
/** Winner picked, no score entered: no game pill. */
export const BestOfThreeNoScore: Story = { args: { score: null, gameScores: [] } }

/** Match page (2026-11-25): every face ringed in its skill group; the winners add a dark gap and the accent ring. */
export const SkillRings: Story = {
  args: {
    cornerLabel: 'Doubles',
    skillRings: true,
    left: [
      { ...face('Jose Buctuanon', 'You'), badge: 2, skillGroup: 'intermediate' },
      { ...face('Dalton Reyes'), badge: 2, skillGroup: 'beginner' },
    ],
    right: [
      { ...face('Gab Santos'), badge: 2, skillGroup: 'advanced' },
      { ...face('J*** R***'), badge: 1, skillGroup: null },
    ],
    ariaLabel: 'Doubles: You and Dalton Reyes versus Gab Santos and J*** R***',
  },
  globals: { theme: 'dark' },
}
export const SkillRingsLight: Story = { ...SkillRings, globals: { theme: 'light' } }
export const SkillRingsPhone: Story = {
  ...SkillRings,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
/** Court tap: the whole court box opens the match page; the faces keep their own buttons. */
export const OpensMatchPage: Story = {
  args: { ...PlayerVariant.args, onOpen: () => {} },
  globals: { theme: 'dark' },
}
export const OpensMatchPageLight: Story = { ...OpensMatchPage, globals: { theme: 'light' } }
