import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'

export type ClashNoticeProps = {
  /** "Venue clash: …" or "Time clash: …", as the rule produces it */
  text: string
  sessionId: string
  onView: (sessionId: string) => void
  className?: string
}

/** A single date that clashes with another session: the clash text and View it; blocks Next and save. */
export function ClashNotice({ text, sessionId, onView, className }: ClashNoticeProps) {
  return (
    <Notice
      tone="error"
      className={className}
      action={
        <Button size="xs" onClick={() => onView(sessionId)}>
          View it
        </Button>
      }
    >
      {text}. Pick another date or time.
    </Notice>
  )
}
