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
  const post = useFacebookPost(sessionId)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const copy = async (text: string) => {
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
      text={post.isPending ? 'Filling in the post…' : (post.data?.text ?? '')}
      playerCount={post.data?.playerCount ?? 0}
      textareaRef={textarea}
      onCopy={copy}
      onEditTemplate={() => router.push('/club-settings/facebook-post')}
    />
  )
}
