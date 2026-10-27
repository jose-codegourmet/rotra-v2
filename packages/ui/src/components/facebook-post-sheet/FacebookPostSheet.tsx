'use client'

import { Button } from '@rotra/ui/button'
import { Sheet } from '@rotra/ui/sheet'
import { Textarea } from '@rotra/ui/textarea'
import type { Ref } from 'react'

export type FacebookPostSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionTitle: string
  /** The filled-in post */
  text: string
  playerCount: number
  onEditTemplate: () => void
  /** Copies the text; when the browser blocks it, select everything in the textarea through the ref */
  onCopy: (text: string) => void
  textareaRef?: Ref<HTMLTextAreaElement>
}

/**
 * The read-only Copy Facebook post dialog opened from preparation and the live console: the filled
 * post, how many players it lists, Edit template, Close and Copy post. ROTRA never posts by itself.
 */
export function FacebookPostSheet({
  open,
  onOpenChange,
  sessionTitle,
  text,
  playerCount,
  onEditTemplate,
  onCopy,
  textareaRef,
}: FacebookPostSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Facebook post"
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="primary" onClick={() => onCopy(text)}>
            Copy post
          </Button>
        </>
      }
    >
      <p className="m-0 text-[13px] text-fg2">
        Filled in from {sessionTitle} and your club's template. Copy it and paste it into your
        Facebook group or page.
      </p>
      <Textarea
        ref={textareaRef}
        aria-label="Facebook post text"
        rows={18}
        readOnly
        value={text}
        className="font-mono"
      />
      <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-fg2">
        <span>
          {playerCount} player{playerCount === 1 ? '' : 's'} listed. Copy it again after you add
          players to get the latest list.
        </span>
        <Button size="xs" variant="ghost" onClick={onEditTemplate}>
          Edit template
        </Button>
      </p>
    </Sheet>
  )
}
