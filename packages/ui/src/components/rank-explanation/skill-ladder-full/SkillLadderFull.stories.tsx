import {
  rankExplanationNoRank,
  rankExplanationPlayer,
  rankExplanationStale,
} from '@rotra/data/fixtures/rank-explanation'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SkillLadderFull } from './SkillLadderFull'

const meta = { title: 'Player/SkillLadderFull', component: SkillLadderFull } satisfies Meta<
  typeof SkillLadderFull
>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: {} }
export const OnLeaderboard: Story = { args: { player: rankExplanationPlayer } }
export const NeedsReassessment: Story = { args: { player: rankExplanationStale } }
export const NoRankYet: Story = { args: { player: rankExplanationNoRank } }
