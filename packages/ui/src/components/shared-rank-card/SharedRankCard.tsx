import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { SkillLadder } from '@rotra/ui/skill-ladder'

export function SharedRankCard({
  level,
  levelLabel,
  position,
  status,
  sentence,
  subject,
  onOpenRankDetail,
}: {
  level: number | null
  levelLabel?: string
  position?: number | null
  status: string
  sentence: string
  subject: string
  onOpenRankDetail: () => void
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-fg2">Shared rank</span>
        <Button size="xs" variant="ghost" onClick={onOpenRankDetail}>
          How this rank works
        </Button>
      </div>
      <div className="flex justify-between gap-3">
        <div>
          <h2>{levelLabel ?? 'No rank yet'}</h2>
          <Chip tone="accent">{status}</Chip>
        </div>
        <div className="text-right">
          <span className="text-sm text-fg2">Overall</span>
          <b className="block font-mono text-xl">{position ? `#${position}` : 'No position'}</b>
        </div>
      </div>
      <SkillLadder level={level} stale={status === 'Needs reassessment'} />
      <p className="m-0 text-fg2">{sentence}</p>
      <p className="m-0 text-sm text-fg2">
        Clubs can still place {subject} at a different level for their own sessions.
      </p>
    </Card>
  )
}
