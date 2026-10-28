'use client'

import { useClub } from '@rotra/data/club'
import { useClubVenues } from '@rotra/data/club-venue/useClubVenues'
import { useSaveClubVenue } from '@rotra/data/club-venue/useSaveClubVenue'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { useInventory } from '@rotra/data/inventory/useInventory'
import { MockError } from '@rotra/data/mock/errors'
import { estimateMinimum, sessionOccurrences } from '@rotra/data/queue-session/queueSession.rules'
import type { QueueSessionInput } from '@rotra/data/queue-session/types'
import { useCreateQueueSession } from '@rotra/data/queue-session/useCreateQueueSession'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useQueueSessions } from '@rotra/data/queue-session/useQueueSessions'
import { useUpdateQueueSession } from '@rotra/data/queue-session/useUpdateQueueSession'
import {
  defaultShuttlePlan,
  estimateSessionCost,
  normalizeSessionCost,
} from '@rotra/data/session-cost/rules'
import { useSessionCostEstimate } from '@rotra/data/session-cost/useSessionCostEstimate'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { ChooseDateSheet } from '@rotra/ui/choose-date-sheet'
import { toYmd } from '@rotra/ui/date-picker/date-calendar/helpers'
import { sessionFinancialsDefaultValues } from '@rotra/ui/forms/session-financials-fields/default-values'
import {
  SessionSetupForm,
  type SessionSetupFormHandle,
  type SessionSetupFormProps,
} from '@rotra/ui/forms/session-setup-form'
import {
  durationMinutes,
  playersPerGame,
  sessionTimes,
} from '@rotra/ui/forms/session-setup-form/helpers'
import type {
  SessionSetupInput,
  SessionSetupValues,
} from '@rotra/ui/forms/session-setup-form/schema'
import { VenueForm } from '@rotra/ui/forms/venue-form'
import { feeToInput } from '@rotra/ui/forms/venue-form/default-values'
import type { RepeatOccurrence } from '@rotra/ui/repeat-schedule-panel'
import { SessionPeekSheet } from '@rotra/ui/session-peek-sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { VenuePickerSheet } from '@rotra/ui/venue-picker-sheet'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { sessionHref } from '@/lib/dates'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import { QueryError } from '../../../_components/query-error/QueryError'

export type SessionSetupProps =
  | { mode: 'create'; date?: string; venueId?: string }
  | { mode: 'edit'; sessionId: string }

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (at: number) => {
  const d = new Date(at)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

type VenueEdit = { mode: 'new'; prefillName: string } | { mode: 'edit'; id: string }

/** Q-SETUP: Create session / Edit preparation, with the date, venue and clash dialogs. */
export function SessionSetup(props: SessionSetupProps) {
  const router = useRouter()
  const offline = useAppSelector(selectDev).offline
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const club = useClub(clubId)
  const venues = useClubVenues()
  const inventory = useInventory()
  const sessions = useQueueSessions(clubId)
  const saveVenue = useSaveClubVenue()
  const create = useCreateQueueSession()
  const update = useUpdateQueueSession()
  const formRef = useRef<SessionSetupFormHandle>(null)

  const [datePicker, setDatePicker] = useState<string | null>(null)
  const [venuePicker, setVenuePicker] = useState<string | null>(null)
  const [venueEdit, setVenueEdit] = useState<VenueEdit | null>(null)
  const [peekId, setPeekId] = useState<string | null>(null)

  const editing = props.mode === 'edit' ? props.sessionId : null
  const existing = useQueueSession(editing ?? '')
  const cost = useSessionCostEstimate(editing ?? '')
  const draftKey = `rotra-setup-draft:${editing ?? 'new'}`
  const [restored, setRestored] = useState<
    { values: Partial<SessionSetupInput>; page: number } | null | undefined
  >(undefined)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey)
      const draft = saved ? JSON.parse(saved) : null
      setRestored(
        draft &&
          typeof draft.values === 'object' &&
          Array.isArray(draft.values.courtLabels) &&
          Array.isArray(draft.values.shuttles)
          ? draft
          : null,
      )
    } catch {
      setRestored(null)
    }
  }, [draftKey])
  const clearDraft = () => {
    try {
      sessionStorage.removeItem(draftKey)
      sessionStorage.removeItem('rotra-setup-return')
    } catch {}
  }
  const manageInventory = () => {
    const values = formRef.current?.getValues()
    if (values) {
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ values, page: formRef.current?.getPage() ?? 2 }),
        )
        sessionStorage.setItem(
          'rotra-setup-return',
          editing ? `/sessions/${editing}/edit` : '/sessions/new',
        )
      } catch {
        toast.error('Could not keep the setup draft on this device.')
        return
      }
    }
    router.push('/inventory?from=setup')
  }
  const roster = useSessionRoster(editing ?? '')
  const isEdit = props.mode === 'edit'
  const backHref = isEdit ? `/sessions/${editing}/preparation` : '/'
  const backLabel = isEdit ? 'Back to preparation' : 'Home'

  if (isEdit) {
    if (existing.isError) {
      if (existing.error instanceof MockError && existing.error.kind === 'permission') notFound()
    } else if (existing.data && existing.data.state !== 'prepared') {
      router.replace(sessionHref(existing.data))
    }
  }

  const venueList = venues.data ?? []
  const pickedVenue = (id: string | undefined) => venueList.find((v) => v.id === id)

  const getOccurrences = (values: SessionSetupInput): RepeatOccurrence[] => {
    const { start, end } = sessionTimes(values)
    return sessionOccurrences(
      {
        id: editing ?? undefined,
        scheduledStartAt: start,
        scheduledEndAt: end,
        venueId: values.venue.venueId,
        repeat: isEdit ? 'none' : values.repeat,
        occurrences: values.repeatCount,
      },
      sessions.data ?? [],
    ).map((o) => ({
      startsAt: o.start,
      endsAt: o.end,
      clash: o.clash ? { sessionId: o.clash.sessionId, text: o.clash.text } : undefined,
    }))
  }
  const computeEstimate: SessionSetupFormProps['computeEstimate'] = (values, players) =>
    estimateMinimum({
      courts: values.courtLabels.length,
      minutes: durationMinutes(values),
      players,
      allowSingles: values.allowSingles,
      allowDoubles: values.allowDoubles,
    })
  void playersPerGame

  const toInput = (values: SessionSetupValues): QueueSessionInput => {
    const { start, end } = sessionTimes(values)
    return {
      costEstimate: normalizeSessionCost(values),
      title: values.title,
      notes: values.notes,
      venueId: values.venue.venueId,
      scheduledStartAt: start,
      scheduledEndAt: end,
      sessionMode: values.sessionMode,
      allowSingles: values.allowSingles,
      allowDoubles: values.allowDoubles,
      minimumGames: Number(values.minimumGames),
      minimumIsCalculated: values.minimumIsCalculated,
      expectedPlayers: values.expectedPlayers,
      playersPerCourt: values.playersPerCourt,
      courts: values.courtLabels.map((label) => ({ label })),
      repeat: isEdit ? 'none' : values.repeat,
      occurrences: values.repeatCount,
    }
  }

  const onSubmit = (values: SessionSetupValues) => {
    const input = toInput(values)
    if (isEdit && editing) {
      update.mutate(
        { sessionId: editing, values: input },
        {
          onSuccess: (result) => {
            toast(result.message)
            clearDraft()
            router.push(`/sessions/${editing}/preparation`)
          },
          onError: (error) => toast.error(errorMessage(error)),
        },
      )
    } else {
      create.mutate(input, {
        onSuccess: (result) => {
          toast(result.message)
          clearDraft()
          router.push(`/sessions/${result.data.firstSessionId}/preparation`)
        },
        onError: (error) => toast.error(errorMessage(error)),
      })
    }
  }
  const mutation = isEdit ? update : create
  const serverError =
    mutation.error instanceof MockError && mutation.error.kind === 'conflict'
      ? mutation.error.message
      : undefined

  const initialValues = (): Partial<SessionSetupInput> | null => {
    if (restored) return restored.values
    if (isEdit) {
      const s = existing.data
      if (!s) return null
      return {
        ...sessionFinancialsDefaultValues,
        ...(cost.data
          ? {
              courtFeePerCourtHour: feeToInput(cost.data.saved.courtFeePerCourtHour),
              entranceFeePerHead: feeToInput(cost.data.saved.entranceFeePerHead),
              paymentMode: cost.data.saved.paymentMode,
              customFeePerHead: feeToInput(cost.data.saved.customFeePerHead),
              shuttles: cost.data.saved.shuttles,
            }
          : {}),
        title: s.title,
        date: toYmd(new Date(s.scheduledStartAt)),
        startTime: hhmm(s.scheduledStartAt),
        endTime: hhmm(s.scheduledEndAt),
        venue: { venueId: s.venueId, name: s.venueName, address: s.venueAddress },
        courtLabels: s.courts.map((c) => c.label),
        playersPerCourt: s.playersPerCourt,
        allowSingles: s.allowSingles,
        allowDoubles: s.allowDoubles,
        sessionMode: s.sessionMode,
        minimumIsCalculated: s.minimumIsCalculated,
        minimumGames: String(s.minimumGames),
        expectedPlayers: s.expectedPlayers === null ? '' : String(s.expectedPlayers),
        notes: s.notes,
      }
    }
    const venue = pickedVenue(props.venueId)
    const entrance = venue?.entranceFeeMinor ?? club.data?.defaultEntranceFeeMinor
    return {
      ...sessionFinancialsDefaultValues,
      courtFeePerCourtHour: feeToInput(venue?.courtFeeMinor ?? null),
      entranceFeePerHead: feeToInput(entrance ?? null),
      shuttles: defaultShuttlePlan({
        courts: 2,
        durationMinutes: 180,
        inventory: inventory.data?.items ?? [],
      }),
      ...(props.date ? { date: props.date } : {}),
      ...(venue ? { venue: { venueId: venue.id, name: venue.name, address: venue.address } } : {}),
    }
  }

  const ready =
    club.data &&
    venues.data &&
    sessions.data &&
    inventory.data &&
    restored !== undefined &&
    (!isEdit || (existing.data && roster.data && !cost.isPending))
  const initial = ready ? initialValues() : null
  const peek = peekId ? sessions.data?.find((s) => s.id === peekId) : undefined
  const markedDates = (sessions.data ?? [])
    .filter((s) => s.id !== editing && s.state !== 'invalid')
    .map((s) => toYmd(new Date(s.scheduledStartAt)))
  const currentVenueEdit = venueEdit?.mode === 'edit' ? pickedVenue(venueEdit.id) : undefined
  const venueFieldError =
    saveVenue.error instanceof MockError ? saveVenue.error.fieldErrors?.name : undefined

  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
      <Breadcrumb label={backLabel} href={backHref} linkAs={Link} />
      {club.isError ? (
        <QueryError query={club} title="Couldn't load the club." />
      ) : venues.isError ? (
        <QueryError query={venues} title="Couldn't load your venues." />
      ) : inventory.isError ? (
        <QueryError query={inventory} title="Couldn't load your inventory." />
      ) : cost.isError && isEdit ? (
        <QueryError query={cost} title="Couldn't load the cost estimate." />
      ) : sessions.isError ? (
        <QueryError query={sessions} title="Couldn't load your sessions." />
      ) : isEdit && existing.isError ? (
        <QueryError query={existing} title="Couldn't load this session." />
      ) : !initial ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <SessionSetupForm
          ref={formRef}
          mode={props.mode}
          initialPage={restored?.page}
          financials={{
            shuttleItems: inventory.data?.items.filter((i) => i.category === 'shuttlecocks') ?? [],
            venueRates: venueList.map((v) => ({
              id: v.id,
              venueName: v.name,
              courtFee: v.courtFeeMinor,
              entranceFee: v.entranceFeeMinor,
            })),
            clubDefaultEntranceFee: club.data?.defaultEntranceFeeMinor,
            computeEstimate: estimateSessionCost,
            onManageInventory: manageInventory,
          }}
          initialValues={initial}
          playersPerCourtDefault={club.data?.defaultPlayersPerCourt}
          clubName={club.data?.name ?? ''}
          offline={offline}
          isPending={mutation.isPending}
          serverError={serverError}
          onSubmit={onSubmit}
          onCancel={() => {
            clearDraft()
            router.push(backHref)
          }}
          onOpenDatePicker={(current) => setDatePicker(current)}
          onOpenVenuePicker={(current) => setVenuePicker(current)}
          onViewClash={setPeekId}
          getOccurrences={getOccurrences}
          computeEstimate={computeEstimate}
          editContext={
            isEdit && roster.data
              ? {
                  rosterCount: roster.data.roster.length,
                  waitlistCount: roster.data.waitlist.length,
                }
              : undefined
          }
        />
      )}
      <ChooseDateSheet
        open={datePicker !== null}
        onOpenChange={(open) => {
          if (!open) setDatePicker(null)
        }}
        value={datePicker ?? ''}
        onApply={(ymd) => {
          formRef.current?.setDate(ymd)
          setDatePicker(null)
        }}
        markedDates={markedDates}
        allowedPastDate={
          isEdit && existing.data ? toYmd(new Date(existing.data.scheduledStartAt)) : undefined
        }
      />
      <VenuePickerSheet
        open={venuePicker !== null && venueEdit === null}
        onOpenChange={(open) => {
          if (!open) setVenuePicker(null)
        }}
        venues={venueList}
        selectedVenueId={venuePicker || null}
        onPick={(id) => {
          const v = pickedVenue(id)
          if (!v) return
          formRef.current?.setVenue({ venueId: v.id, name: v.name, address: v.address })
          toast(`${v.name} selected`)
          setVenuePicker(null)
        }}
        onEdit={(id) => {
          saveVenue.reset()
          setVenueEdit({ mode: 'edit', id })
        }}
        onAddNew={(prefillName) => {
          saveVenue.reset()
          setVenueEdit({ mode: 'new', prefillName })
        }}
      />
      {venueEdit ? (
        <VenueForm
          open
          onOpenChange={(open) => {
            if (!open && !saveVenue.isPending) setVenueEdit(null)
          }}
          mode={venueEdit.mode}
          cancelLabel="Back"
          onCancel={() => setVenueEdit(null)}
          isPending={saveVenue.isPending}
          serverError={venueFieldError}
          existingNames={venueList.filter((v) => v.id !== currentVenueEdit?.id).map((v) => v.name)}
          defaultValues={
            currentVenueEdit
              ? {
                  name: currentVenueEdit.name,
                  address: currentVenueEdit.address,
                  courtFee: feeToInput(currentVenueEdit.courtFeeMinor),
                  entranceFee: feeToInput(currentVenueEdit.entranceFeeMinor),
                }
              : venueEdit.mode === 'new'
                ? { name: venueEdit.prefillName }
                : undefined
          }
          onSubmit={(values) =>
            saveVenue.mutate(
              {
                id: currentVenueEdit?.id,
                name: values.name,
                address: values.address ?? '',
                courtFeeMinor: values.courtFee,
                entranceFeeMinor: values.entranceFee,
              },
              {
                onSuccess: (result) => {
                  toast(result.message)
                  const v = result.data
                  formRef.current?.setVenue({ venueId: v.id, name: v.name, address: v.address })
                  setVenueEdit(null)
                  setVenuePicker(null)
                },
                onError: (error) => {
                  if (!(error instanceof MockError && error.fieldErrors))
                    toast.error(errorMessage(error))
                },
              },
            )
          }
        />
      ) : null}
      {peek ? (
        <SessionPeekSheet
          open
          onOpenChange={(open) => {
            if (!open) setPeekId(null)
          }}
          title={peek.title}
          state={
            peek.state === 'active' || peek.state === 'finalizing'
              ? 'live'
              : peek.state === 'prepared'
                ? 'prepared'
                : peek.state
          }
          startsAt={peek.scheduledStartAt}
          endsAt={peek.scheduledEndAt}
          venueName={peek.venueName}
          courts={Math.max(1, Math.round(peek.capacity / peek.playersPerCourt))}
          rosterCount={peek.rosterCount}
          fromSetup
          onOpen={() => router.push(sessionHref(peek))}
        />
      ) : null}
    </main>
  )
}
