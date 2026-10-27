import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip, type ChipProps } from '@rotra/ui/chip'
export type MyPositionCardProps = {
  fullName: string
  levelLabel?: string
  position?: number
  status?: {
    label: string
    tone: NonNullable<ChipProps['tone']>
    sentence: string
    needsReassessment?: boolean
  }
  onShowMyRow?: () => void
  onOpenProfile: () => void
}
export function MyPositionCard({
  fullName,
  levelLabel,
  position,
  status,
  onShowMyRow,
  onOpenProfile,
}: MyPositionCardProps) {
  if (position !== undefined && levelLabel)
    return (
      <Card className="flex items-center justify-between gap-3 border-accent bg-accent-subtle">
        <div className="flex items-center gap-3">
          <Avatar name={fullName} />
          <div>
            <p className="m-0 text-sm text-fg2">Your position</p>
            <b className="font-mono text-xl">
              #{position.toLocaleString('en-PH')} · {levelLabel}
            </b>
          </div>
        </div>
        <Button size="sm" onClick={onShowMyRow}>
          Show my row
        </Button>
      </Card>
    )
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3>
          You&apos;re not on the leaderboard{status?.needsReassessment ? ' right now' : ' yet'}
        </h3>
        {status ? <Chip tone={status.tone}>{status.label}</Chip> : null}
      </div>
      {status ? <p className="m-0 text-fg2">{status.sentence}</p> : null}
      <Button size="xs" onClick={onOpenProfile}>
        Open my profile
      </Button>
    </Card>
  )
}
