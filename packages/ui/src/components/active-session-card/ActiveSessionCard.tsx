import { Card } from '@rotra/ui/card'
import { useId } from 'react'

export type ActiveSessionCardProps = {
  /** The club's running session; wins over exceptionNote */
  session?: { title: string; venueName: string; startedAt: Date | string }
  /** Why a session ran past the license end (Talamban), shown when nothing is running */
  exceptionNote?: string
}

const TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
})

/**
 * Club detail › Overview: the club's one active session, an expiry exception, or "No session
 * running." The session venue is shown here, apart from the club's fixed founding address.
 */
export function ActiveSessionCard({ session, exceptionNote }: ActiveSessionCardProps) {
  const headingId = useId()
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId}>Active session</h2>
        {session ? (
          <>
            <p className="m-0">
              <span className="inline-flex items-center gap-1.5">
                <i
                  aria-hidden
                  className="size-2 flex-none rounded-full bg-accent animate-[pulse_1.6s_infinite] motion-reduce:animate-none"
                />
                <b className="[overflow-wrap:anywhere]">{session.title}</b>
              </span>
            </p>
            <p className="m-0 text-[13px] text-fg2">
              At {session.venueName} · started {TIME.format(new Date(session.startedAt))}. If the
              license ends during a session, that session can still finish and sync.
            </p>
          </>
        ) : exceptionNote ? (
          <p className="m-0 text-[13px]">{exceptionNote}</p>
        ) : (
          <p className="m-0 text-[13px] text-fg2">No session running.</p>
        )}
      </section>
    </Card>
  )
}
