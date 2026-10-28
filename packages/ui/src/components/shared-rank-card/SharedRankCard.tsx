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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Shared rank</span>
        <Button size="xs" variant="ghost" onClick={onOpenRankDetail}>
          How this rank works
        </Button>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.4px]">{levelLabel ?? 'No rank yet'}</h2>
          <Chip tone={status === 'Needs reassessment' || status === 'Updating' ? 'warn' : status === 'Provisional' || status === 'Not calculated' ? 'neutral' : 'accent'}>{status}</Chip>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Overall</span>
          <b className={position ? "block font-mono text-[40px] leading-none font-semibold text-accent" : "block text-xl font-bold text-fg2"}>{position ? `#${position}` : 'No position'}</b>
        </div>
      </div>
      <SkillLadder level={level} stale={status === 'Needs reassessment'} />
      <p className="m-0 text-[13px] text-fg2">{sentence}</p>
      <p className="m-0 text-[13px] text-fg2">
        Clubs can still place {subject} at a different level for their own sessions.
      </p>
    </Card>
  )
}
