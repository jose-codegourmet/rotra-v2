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
  /** The post is being filled in; Copy post waits for it */
  loading?: boolean
  /** Why the post could not be filled in; shown instead of the post, and Copy post is disabled */
  error?: string
  onRetry?: () => void
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
  loading = false,
  error,
  onRetry,
}: FacebookPostSheetProps) {
  const empty = !text.trim()
  const canCopy = !loading && !error && !empty
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Facebook post"
      wide
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="primary" disabled={!canCopy} onClick={() => onCopy(text)}>
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
        value={loading ? 'Filling in the post…' : text}
        className="font-mono"
      />
      {error ? (
        <p role="alert" className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-error">
          <span>{error}</span>
          {onRetry ? (
            <Button size="xs" variant="ghost" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </p>
      ) : !loading && empty ? (
        <p role="alert" className="m-0 text-[13px] text-fg2">
          The post is empty, so there is nothing to copy. Check your template in Edit template.
        </p>
      ) : null}
      <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-fg2">
        <span>
          {loading || error
            ? 'Player count shows once the post is filled in.'
            : `${playerCount} player${playerCount === 1 ? '' : 's'} listed. Copy it again after you add players to get the latest list.`}
        </span>
        <Button size="xs" variant="ghost" onClick={onEditTemplate}>
          Edit template
        </Button>
      </p>
    </Sheet>
  )
}
