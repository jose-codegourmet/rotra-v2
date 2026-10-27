'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'

export type PostPreviewSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The session the preview was filled in from */
  sessionTitle: string
  /** "Sun, Oct 25" */
  dateLabel: string
  /** The filled-in post */
  text: string
  /** The editor has unsaved changes that the preview includes */
  includesUnsaved?: boolean
}

/** Post preview: the template filled in from the current or next session, with Back to editing. */
export function PostPreviewSheet({
  open,
  onOpenChange,
  sessionTitle,
  dateLabel,
  text,
  includesUnsaved,
}: PostPreviewSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Post preview"
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Back to editing
        </Button>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        Filled in from <b>{sessionTitle}</b>, {dateLabel}.
        {includesUnsaved ? ' Includes your unsaved changes.' : null}
      </p>
      <pre className="m-0 max-h-[62vh] overflow-y-auto rounded-md border border-border-strong bg-bg px-3.5 py-3 font-sans text-sm leading-[1.55] whitespace-pre-wrap [overflow-wrap:anywhere]">
        {text}
      </pre>
    </Sheet>
  )
}
