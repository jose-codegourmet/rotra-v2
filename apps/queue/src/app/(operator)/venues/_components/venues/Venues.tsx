'use client'

import { useClubVenues } from '@rotra/data/club-venue/useClubVenues'
import { useSaveClubVenue } from '@rotra/data/club-venue/useSaveClubVenue'
import { MockError } from '@rotra/data/mock/errors'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import { VenueForm } from '@rotra/ui/forms/venue-form'
import { feeToInput } from '@rotra/ui/forms/venue-form/default-values'
import { PageHeader } from '@rotra/ui/page-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { VenueCard } from '@rotra/ui/venue-card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { shortDateLabel } from '@/lib/dates'

type Editing = { mode: 'new' } | { mode: 'edit'; id: string }

/** Q-VENUES: the club's saved venues, with Add venue and Edit in the venue form sheet. */
export function Venues() {
  const router = useRouter()
  const venues = useClubVenues()
  const save = useSaveClubVenue()
  const [editing, setEditing] = useState<Editing | null>(null)
  const current =
    editing?.mode === 'edit' ? venues.data?.find((v) => v.id === editing.id) : undefined

  const fieldError = save.error instanceof MockError ? save.error.fieldErrors?.name : undefined

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <Breadcrumb label="Home" href="/" linkAs={Link} />
      <PageHeader
        title="Venues"
        description="Places your club books. Picking one in session setup fills in the address and court fee."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              save.reset()
              setEditing({ mode: 'new' })
            }}
          >
            Add venue
          </Button>
        }
      />
      {venues.isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-60 rounded-[14px]" />
          ))}
        </div>
      ) : venues.data?.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
          {venues.data.map((venue) => (
            <VenueCard
              key={venue.id}
              name={venue.name}
              address={venue.address || null}
              courtFeeMinor={venue.courtFeeMinor}
              entranceFeeMinor={venue.entranceFeeMinor}
              sessionsHere={venue.sessionsHere}
              next={
                venue.nextSession
                  ? {
                      title: venue.nextSession.title,
                      dateLabel: shortDateLabel(venue.nextSession.scheduledStartAt),
                    }
                  : undefined
              }
              onCreateSession={() => router.push(`/sessions/new?venueId=${venue.id}`)}
              onEdit={() => {
                save.reset()
                setEditing({ mode: 'edit', id: venue.id })
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState>No venues yet. Add one here, or when you create a session.</EmptyState>
      )}
      {editing ? (
        <VenueForm
          open
          onOpenChange={(open) => {
            if (!open && !save.isPending) setEditing(null)
          }}
          mode={editing.mode}
          cancelLabel="Cancel"
          isPending={save.isPending}
          serverError={fieldError ?? (save.error && !fieldError ? save.error.message : undefined)}
          existingNames={(venues.data ?? []).filter((v) => v.id !== current?.id).map((v) => v.name)}
          defaultValues={
            current
              ? {
                  name: current.name,
                  address: current.address,
                  courtFee: feeToInput(current.courtFeeMinor),
                  entranceFee: feeToInput(current.entranceFeeMinor),
                }
              : undefined
          }
          onSubmit={(values) =>
            save.mutate(
              {
                id: current?.id,
                name: values.name,
                address: values.address ?? '',
                courtFeeMinor: values.courtFee,
                entranceFeeMinor: values.entranceFee,
              },
              {
                onSuccess: (result) => {
                  toast(result.message)
                  setEditing(null)
                },
                onError: (error) => {
                  if (!(error instanceof MockError && error.fieldErrors)) toast.error(error.message)
                },
              },
            )
          }
        />
      ) : null}
    </main>
  )
}
