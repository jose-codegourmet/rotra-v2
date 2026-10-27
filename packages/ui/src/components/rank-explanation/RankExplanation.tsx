import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { SkillLadderFull } from './skill-ladder-full/SkillLadderFull'
import { WeightSplitBar } from './weight-split-bar/WeightSplitBar'
export type RankExplanationProps = {
  assessmentWeightPercent: number
  player?: { firstName: string; levelIndex: number | null; stale: boolean; levelLabel: string }
}
export function RankExplanation({ assessmentWeightPercent: w, player }: RankExplanationProps) {
  return (
    <div className="flex flex-col gap-5 [&_h2]:text-lg [&_h2]:font-extrabold [&_h3]:text-[15px] [&_h3]:font-bold">
      <Card className="flex flex-col gap-3">
        <h2>Two parts</h2>
        <WeightSplitBar assessmentWeightPercent={w} />
        <div className="flex flex-wrap justify-between gap-3 text-[13px]">
          <span>
            <b className="font-mono text-lg">{w}%</b> club assessments
          </span>
          <span>
            <b className="font-mono text-lg">{100 - w}%</b> match performance
          </span>
        </div>
        <div className="grid grid-cols-2 gap-5 max-[720px]:grid-cols-1">
          <div className="flex flex-col gap-2">
            <h3>Club assessments</h3>
            <p className="text-[13px] text-fg2">
              Each club where the player was assessed in the last three months counts once, with
              equal weight. Only that club's latest assessment counts, however often the player goes
              there.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3>Match performance</h3>
            <p className="text-[13px] text-fg2">
              Wins and losses in eligible matches from the same three months, weighed against the
              levels of partners and opponents. Scores, when a club enters them, show how close a
              game was. A game with only a winner recorded still counts.
            </p>
          </div>
        </div>
        <p className="text-[13px] text-fg2">
          The ROTRA platform owner sets these weights and can change them. This page explains the
          method; it doesn't list each club's assessment.
        </p>
      </Card>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>The skill ladder</h2>
          {player && (
            <Chip tone={player.levelIndex === null ? 'neutral' : player.stale ? 'warn' : 'accent'}>
              {player.levelLabel}
            </Chip>
          )}
        </div>
        <p className="text-[13px] text-fg2">
          Nine levels, from Beginner Low to Advanced High. Clubs assess each player at one of them,
          such as Intermediate High.
        </p>
        <SkillLadderFull player={player} />
      </Card>
      <div className="grid grid-cols-2 gap-5 max-[720px]:grid-cols-1">
        <Card className="flex flex-col gap-2">
          <h2>Clubs set their own levels</h2>
          <p className="text-[13px] text-fg2">
            The shared rank is a suggestion. Each club decides the level a player gets in its own
            sessions, and an Advanced player can be placed lower at a stronger club. Clubs assess
            players while preparing the roster, and levels stay fixed once the session starts.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2>When it changes</h2>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg2">
            <li>A club's new assessment counts once that club's device syncs.</li>
            <li>Match results count after the club marks a valid session done.</li>
            <li>Sharing results on social media has no effect on rank.</li>
            <li>
              After three months without playing, the rank stays visible marked{' '}
              <b>Needs reassessment</b>.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
