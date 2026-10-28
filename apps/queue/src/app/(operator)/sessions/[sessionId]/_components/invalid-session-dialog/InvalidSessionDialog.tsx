'use client'

import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useInvalidateSession } from '@rotra/data/queue-session/useInvalidateSession'
import { InvalidSessionConfirm } from '@rotra/ui/invalid-session-confirm'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'

export type InvalidSessionDialogProps = {
  sessionId: string
  reason: string
  open: boolean
  onBack: () => void
}
export function InvalidSessionDialog({
  sessionId,
  reason,
  open,
  onBack,
}: InvalidSessionDialogProps) {
  const session = useQueueSession(sessionId),
    invalidate = useInvalidateSession(),
    router = useRouter()
  if (!session.data) return null
  const s = session.data
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !invalidate.isPending) onBack()
      }}
      title="Declare session invalid?"
      dismissible={!invalidate.isPending}
    >
      {invalidate.error ? <Notice tone="error">{invalidate.error.message}</Notice> : null}
      <InvalidSessionConfirm
        sessionTitle={s.title}
        when={new Date(s.scheduledStartAt).toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        reason={reason}
        isPending={invalidate.isPending}
        onBack={onBack}
        onConfirm={() =>
          invalidate.mutate(
            { sessionId, reason },
            {
              onSuccess: (result) => {
                toast(result.message)
                router.push(`/sessions/${sessionId}/record`)
              },
              onError: (error) => toast.error(error.message),
            },
          )
        }
      />
    </Sheet>
  )
}
