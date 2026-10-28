'use client'

import { useSessionPublication } from '@rotra/data/session-result/useSessionPublication'
import { usePublishResults } from '@rotra/data/session-result/usePublishResults'
import { useSessionResults } from '@rotra/data/session-result/useSessionResults'
import type { PublishedSlide } from '@rotra/data/session-result/types'
import { useSyncState } from '@rotra/data/sync/useSyncState'
import { PublishResultsForm } from '@rotra/ui/forms/publish-results-form'
import { publishResultsFormDefaultValues } from '@rotra/ui/forms/publish-results-form/default-values'
import type { PublishResultsFormValues } from '@rotra/ui/forms/publish-results-form/schema'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectDev } from '@/store/slices/devSlice'

export type PublishResultsSheetProps = {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PUBLISHED_TOAST = 'Results published to the session page'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-PUBLISH / D-PUBLISH / D-OFF-DAY: the Publish results sheet over the private snapshot. The form
 * remounts on every open, so Standings and Awards start from the previous publication (both on the
 * first time) and Include Off Day always starts unchecked. A failed publish keeps the sheet open
 * with the reason and the selection; the previous publication is untouched.
 */
export function PublishResultsSheet({ sessionId, open, onOpenChange }: PublishResultsSheetProps) {
  const dev = useAppSelector(selectDev)
  const sync = useSyncState()
  const results = useSessionResults(sessionId)
  const publication = useSessionPublication(sessionId)
  const publish = usePublishResults()
  const [serverError, setServerError] = useState<string>()
  // Bumped on every open: a fresh form, so no checkbox (above all Off Day) carries over.
  const [opened, setOpened] = useState(0)

  useEffect(() => {
    if (open) {
      setOpened((n) => n + 1)
      setServerError(undefined)
    }
  }, [open])

  const snapshot = results.data
  if (!snapshot || publication.isPending) return null

  const previous = publication.data
    ? {
        standings: publication.data.publishedSlides.includes('standings'),
        awards: publication.data.publishedSlides.includes('awards'),
      }
    : null
  const online = !dev.offline && (sync.data ? sync.data.online : true)

  const onSubmit = (values: PublishResultsFormValues) => {
    setServerError(undefined)
    const publishedSlides: PublishedSlide[] = [
      ...(values.standings ? (['standings'] as const) : []),
      ...(values.awards ? (['awards'] as const) : []),
    ]
    publish.mutate(
      { sessionId, publishedSlides, includeOffDay: values.includeOffDay },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast(PUBLISHED_TOAST)
        },
        onError: (error) => {
          setServerError(errorMessage(error))
          toast.error(errorMessage(error))
        },
      },
    )
  }

  return (
    <PublishResultsForm
      key={opened}
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={publishResultsFormDefaultValues(previous)}
      offDayNames={snapshot.awards.offDay.map((x) => x.name)}
      standingsCount={snapshot.standings.length}
      hasMostImproved={snapshot.awards.mostImproved !== null}
      online={online}
      onSubmit={onSubmit}
      isPending={publish.isPending}
      serverError={serverError}
    />
  )
}
