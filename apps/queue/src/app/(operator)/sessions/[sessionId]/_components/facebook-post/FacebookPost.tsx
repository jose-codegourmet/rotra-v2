'use client'

import { useFacebookPost } from '@rotra/data/club/useFacebookPost'
import { FacebookPostSheet } from '@rotra/ui/facebook-post-sheet'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export type FacebookPostProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The Copy Facebook post dialog, shared by preparation and the live console. */
export function FacebookPost({ sessionId, open, onOpenChange }: FacebookPostProps) {
  const router = useRouter()
  const post = useFacebookPost(sessionId, open)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const copy = async (text: string) => {
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      toast('Facebook post copied')
    } catch {
      textarea.current?.focus()
      textarea.current?.select()
      toast('Text selected. Copy it with your keyboard or long-press')
    }
  }
  return (
    <FacebookPostSheet
      open={open}
      onOpenChange={onOpenChange}
      sessionTitle={post.data?.sessionTitle ?? '…'}
      text={post.data?.text ?? ''}
      playerCount={post.data?.playerCount ?? 0}
      loading={open && (post.isPending || post.isFetching)}
      error={
        post.isError
          ? `Couldn't fill in the post. ${post.error instanceof Error ? post.error.message : 'Try again.'}`
          : undefined
      }
      onRetry={() => void post.refetch()}
      textareaRef={textarea}
      onCopy={copy}
      onEditTemplate={() => router.push('/club-settings/facebook-post')}
    />
  )
}
