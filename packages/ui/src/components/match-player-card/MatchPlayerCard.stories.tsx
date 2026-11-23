import type { MatchLineupPlayerFixture } from '@rotra/data/fixtures/match-lineups'
import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MatchPlayerCard, type MatchPlayerCardProps } from './MatchPlayerCard'

const propsFor = (
  p: MatchLineupPlayerFixture | undefined,
  minimumGames: number,
): MatchPlayerCardProps => {
  if (!p) throw new Error('Lineup fixture missing')
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    games: p.games,
    minimumGames,
    team: 'A',
    onClick: fn(),
  }
}

const { belowMinimum, everyoneMet, longNames } = matchLineupFixtures

const meta = {
  title: 'Queue/MatchPlayerCard',
  component: MatchPlayerCard,
  decorators: [
    (Story) => (
      <div className="w-[260px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(belowMinimum.teamA[0], belowMinimum.minimumGames),
} satisfies Meta<typeof MatchPlayerCard>

export default meta
type Story = StoryObj<typeof meta>

export const BelowMinimum: Story = {}
export const AtMinimum: Story = {
  args: propsFor(everyoneMet.teamA[0], everyoneMet.minimumGames),
}
export const NoLevel: Story = { args: { level: null } }
const band = (level: PlayingLevel): Story => ({ args: { level } })
/** The picture's ring: Beginner, Intermediate and Advanced; grey with no level. Hover names the level. */
export const Beginner: Story = band('beginner_mid')
export const Intermediate: Story = band('intermediate_mid')
export const Advanced: Story = band('advanced_mid')
export const AdvancedLight: Story = { ...Advanced, globals: { theme: 'light' } }
export const NoLevelLight: Story = { ...NoLevel, globals: { theme: 'light' } }
/** Open match: the picture opens the profile, the card brings in someone from outside. Tab to see both focus rings. */
export const SwappableVariant: Story = {
  args: { variant: 'swappable', onOpenProfile: fn(), actionLabel: 'Substitute or replace' },
}
export const SwappableVariantLight: Story = {
  ...SwappableVariant,
  globals: { theme: 'light' },
}
/** The label gains the arrow-key hint; TeamLineup wraps it in a SwappablePlayer for the behaviour. */
export const Swappable: Story = { args: { swappable: true } }
export const LongName: Story = {
  args: propsFor(longNames.teamA[0], longNames.minimumGames),
}
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-[335px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(longNames.teamA[0], longNames.minimumGames),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
