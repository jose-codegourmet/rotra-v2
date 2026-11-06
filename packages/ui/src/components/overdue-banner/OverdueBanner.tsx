import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'

const MINUTE = 60_000

/** "15 min", "1 h", "1 h 20 min", like the prototype's courtDuration(). */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ') || '0 min'
}

export type SessionEndStatus = { over: boolean; text: string }

/**
 * Time left until the planned end ("1 h 20 min left"), or how long ago it passed ("Planned end passed
 * 15 min ago"), like the prototype's endStatus(). The session never closes by itself (T5).
 */
export function sessionEndStatus(endsAt: number, now: number): SessionEndStatus {
  if (now < endsAt) {
    return {
      over: false,
      text: `${formatMinutes(Math.max(1, Math.ceil((endsAt - now) / MINUTE)))} left`,
    }
  }
  return {
    over: true,
    text: `Planned end passed ${formatMinutes(Math.max(1, Math.floor((now - endsAt) / MINUTE)))} ago`,
  }
}

export type OverdueBannerProps = {
  /** The session's planned end */
  endsAt: number
  /** The current time; stories pass a fixed one so the text stays stable */
  now?: number
  /** Opens Courts and time (Q-SESSION-ADJUST) focused on the New end picker */
  onSetEndTime: () => void
  /** Opens Session done */
  onSessionDone: () => void
  /** Session done needs internet: disabled while offline */
  offline?: boolean
  className?: string
}

/**
 * Q-CONSOLE overdue banner (T5): after the planned end, a warning notice "Planned end passed N ago."
 * with Set end time and Session done. Renders nothing before the planned end.
 */
export function OverdueBanner({
  endsAt,
  now: nowProp,
  onSetEndTime,
  onSessionDone,
  offline,
  className,
}: OverdueBannerProps) {
  const status = sessionEndStatus(endsAt, nowProp ?? Date.now())
  if (!status.over) return null
  return (
    <Notice
      tone="warn"
      className={className}
      title={`${status.text}.`}
      action={
        <>
          <Button size="sm" onClick={onSetEndTime}>
            Set end time
          </Button>
          <Button
            size="sm"
            disabled={offline}
            title={offline ? 'Session done needs internet' : undefined}
            onClick={onSessionDone}
          >
            Session done
          </Button>
        </>
      }
    />
  )
}
