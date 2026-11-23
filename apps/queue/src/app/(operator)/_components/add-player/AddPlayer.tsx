'use client'

import { useAddDirectoryPlayerToClub } from '@rotra/data/club-player/useAddDirectoryPlayerToClub'
import { useAddNewSavedPlayer } from '@rotra/data/club-player/useAddNewSavedPlayer'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useSetClubPlayerPicture } from '@rotra/data/club-player/useSetClubPlayerPicture'
import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import { MockError } from '@rotra/data/mock/errors'
import { slotCapacity } from '@rotra/data/queue-session/queueSession.rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import type { RosterAddPlacement } from '@rotra/data/session-roster/mutations'
import { ROSTER_DUPLICATE_ERROR } from '@rotra/data/session-roster/sessionRoster.rules'
import { useAddDirectoryPlayerToSession } from '@rotra/data/session-roster/useAddDirectoryPlayerToSession'
import { useAddNewPlayerToSession } from '@rotra/data/session-roster/useAddNewPlayerToSession'
import { useAddSavedPlayerToSession } from '@rotra/data/session-roster/useAddSavedPlayerToSession'
import { usePlayerLookup } from '@rotra/data/session-roster/usePlayerLookup'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import {
  type AddPlayerCandidate,
  type AddPlayerClubConfirmInput,
  type AddPlayerConfirmInput,
  AddPlayerSheet,
} from '@rotra/ui/add-player-sheet'
import type { ClubPictureChoice } from '@rotra/ui/club-picture-field'
import type {
  NewPlayerFormValues,
  NewSavedPlayerFormValues,
} from '@rotra/ui/forms/new-player-form/schema'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { OverfillConfirm } from '@/app/(operator)/_components/overfill-confirm/OverfillConfirm'

export type AddPlayerProps = {
  /** The session to add to. Without one (Saved players), the sheet saves to the club's saved players only. */
  sessionId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/** "#214" from the mock lookup reads "Rank 214" on the sheet; "Not ranked" reads "Not ranked yet". */
const rankLabel = (label: string) =>
  label.startsWith('#') ? `Rank ${Number(label.slice(1)).toLocaleString()}` : 'Not ranked yet'

const EMAIL_SAVED = /^That email is already (.+) in your saved players\.$/

/**
 * "That email is already NAME in your saved players." refuses a new player's email: NAME shows under
 * the email field (the form's emailSavedAs), not as a second notice or toast.
 */
const emailSavedName = (error: unknown) =>
  error instanceof MockError && error.fieldErrors?.email
    ? EMAIL_SAVED.exec(error.fieldErrors.email)?.[1]
    : undefined

/** #1019: a refused social link ("That social link is already NAME…") shows under its field. */
const socialLinkFieldError = (error: unknown) =>
  error instanceof MockError ? error.fieldErrors?.socialLink : undefined

/** A refused phone ("NAME already has this number.") shows under its field. */
const phoneFieldError = (error: unknown) =>
  error instanceof MockError ? error.fieldErrors?.phone : undefined

/**
 * What both contexts share: the Player Information lookup (exact RTR ID, email or social link), the status line,
 * addedCount and the refusal. A conflict for which `returnsToList` says so is final for that pick:
 * the sheet returns to the list. A failed save (retryable, offline) keeps the card or form with what
 * was typed.
 */
function useAddSheet(open: boolean, returnsToList: (error: unknown) => boolean) {
  const submitting = useRef(false)
  const offline = !useConnectivity().online
  const [query, setQuery] = useState('')
  const lookup = usePlayerLookup(query)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [addedCount, setAddedCount] = useState(0)
  const [serverError, setServerError] = useState<string | undefined>()
  const [errorReturnsToList, setErrorReturnsToList] = useState(false)
  const [emailSavedAs, setEmailSavedAs] = useState<string | undefined>()
  const [socialLinkError, setSocialLinkError] = useState<string | undefined>()
  const [phoneError, setPhoneError] = useState<string | undefined>()

  // A fresh sheet each time it opens: Cancel until someone is added, no stale status line.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setLastAdded(null)
      setAddedCount(0)
      setServerError(undefined)
      setEmailSavedAs(undefined)
      setSocialLinkError(undefined)
      setPhoneError(undefined)
      setQuery('')
    }
  }

  // The one exact match, or none. Another club's unclaimed player (ownNameRequired) has no name,
  // picture, level or rank to show: the sheet reads "Not registered yet" and asks for this club's name.
  // The one exact match, or (D-2026-11-23-01) the unclaimed players whose name matches. Another
  // club's unclaimed player shows the first club's name and picture; this club enters its own name.
  const found = lookup.data?.player
  const directoryResults: AddPlayerCandidate[] = (
    found ? [found] : (lookup.data?.matches ?? [])
  ).map((p) => ({
    id: p.id,
    name: p.fullName,
    nickname: p.nickname,
    photoUrl: profilePictureSrc(p.picture, p.id, p.fullName),
    rtrId: p.rtrId,
    identity: p.identity,
    suggestion: p.suggestion,
    phoneHidden: p.phoneHidden,
    ownNameRequired: p.ownNameRequired,
    rankLabel: p.ownNameRequired ? undefined : rankLabel(p.rankLabel),
  }))

  const options = {
    onSettled: () => {
      submitting.current = false
    },
    onSuccess: (result: { message: string }) => {
      setServerError(undefined)
      setLastAdded(result.message)
      setAddedCount((n) => n + 1)
      toast(result.message)
    },
    onError: (error: unknown) => {
      const phoneRefused = phoneFieldError(error)
      if (phoneRefused) {
        setPhoneError(phoneRefused)
        setErrorReturnsToList(false)
        return
      }
      const linkError = socialLinkFieldError(error)
      if (linkError) {
        setSocialLinkError(linkError)
        setErrorReturnsToList(false)
        return
      }
      const savedAs = emailSavedName(error)
      if (savedAs) {
        setEmailSavedAs(savedAs)
        setErrorReturnsToList(false)
        return
      }
      const message = errorMessage(error)
      setErrorReturnsToList(returnsToList(error))
      setServerError(message)
      toast.error(message)
    },
  }
  /** Starts one add; false while another is still running. */
  const begin = () => {
    if (submitting.current) return false
    submitting.current = true
    setServerError(undefined)
    setEmailSavedAs(undefined)
    setSocialLinkError(undefined)
    setPhoneError(undefined)
    return true
  }

  return {
    offline,
    begin,
    options,
    sheet: {
      offline,
      onDirectorySearch: setQuery,
      directoryResults,
      directorySavedName: lookup.data?.savedName ?? undefined,
      newPlayerEmailSavedAs: emailSavedAs,
      newPlayerSocialLinkError: socialLinkError,
      newPlayerPhoneError: phoneError,
      directoryLoading: !offline && lookup.isFetching && !lookup.data,
      serverErrorReturnsToList: errorReturnsToList,
      lastAdded,
      addedCount,
    },
    serverError,
  }
}

/**
 * Q-ADD-PLAYER container. With a session it is shared by preparation (Add player) and the console
 * (Add late player): AddPlayerSheet on the saved, Player Information and new-player session adds.
 * Without one it is Saved players › Add player: the sheet's club context saves to the saved players
 * only. Either way the sheet stays open; every add toasts and bumps addedCount so the tab clears and
 * refocuses. Offline, new players save locally and the Player Information tab shows its notice; the
 * lookup never runs, so nothing spins.
 */
export function AddPlayer({ sessionId, ...props }: AddPlayerProps) {
  return sessionId ? (
    <SessionAddPlayer sessionId={sessionId} {...props} />
  ) : (
    <ClubAddPlayer {...props} />
  )
}

function SessionAddPlayer({
  sessionId,
  open,
  onOpenChange,
}: AddPlayerProps & { sessionId: string }) {
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const clubPlayers = useClubPlayers()
  const addSaved = useAddSavedPlayerToSession()
  const addDirectory = useAddDirectoryPlayerToSession()
  const addNew = useAddNewPlayerToSession()
  const add = useAddSheet(
    open,
    (error) =>
      error instanceof MockError &&
      error.kind === 'conflict' &&
      error.message === ROSTER_DUPLICATE_ERROR,
  )

  const s = session.data
  const rosterList = roster.data?.roster ?? []
  const waitlist = roster.data?.waitlist ?? []
  const capacity = s ? slotCapacity(s.courts.length, s.playersPerCourt) : 0
  const inSessionIds = [...rosterList, ...waitlist].map((p) => p.clubPlayerId)

  const savedPlayers: AddPlayerCandidate[] = (clubPlayers.data?.players ?? []).map((p) => ({
    id: p.id,
    name: p.fullName,
    nickname: p.nickname,
    photoUrl: profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName),
    rtrId: p.rtrId,
    identity: p.identity,
    suggestion: p.suggestion,
    phoneHidden: p.phoneHidden,
    detailsRequired: p.detailsRequired,
  }))

  const isPending = addSaved.isPending || addDirectory.isPending || addNew.isPending
  /** D-OVERFILL (#735): the add waiting on Add anyway / Add to waitlist while the roster is full */
  const [overfill, setOverfill] = useState<{
    name: string
    run: (placement: RosterAddPlacement) => void
  } | null>(null)
  /** Runs the add now, or asks once first when the roster is already at the slot budget. */
  const placeOrAsk = (name: string, run: (placement: RosterAddPlacement) => void) => {
    if (rosterList.length >= capacity) setOverfill({ name, run })
    else run({})
  }

  const confirm = ({ candidate, source, level, name }: AddPlayerConfirmInput) => {
    if (!s || !roster.data || !clubPlayers.data) return
    placeOrAsk(candidate.name, (placement) => {
      if (!add.begin()) return
      if (source === 'saved')
        addSaved.mutate(
          {
            sessionId,
            clubPlayerId: candidate.id,
            level,
            ...placement,
          },
          add.options,
        )
      else
        addDirectory.mutate(
          {
            sessionId,
            playerId: candidate.id,
            level,
            name,
            ...placement,
          },
          add.options,
        )
    })
  }

  const submitNewPlayer = (values: NewPlayerFormValues) => {
    if (!s || !roster.data) return
    placeOrAsk(values.name.trim(), (placement) => {
      if (!add.begin()) return
      addNew.mutate(
        {
          sessionId,
          name: values.name,
          nickname: values.nickname ?? undefined,
          email: values.email ?? undefined,
          socialLink: values.socialLink ?? undefined,
          phone: values.phone ?? undefined,
          level: values.level,
          ...placement,
        },
        add.options,
      )
    })
  }
  const answer = (placement: RosterAddPlacement) => {
    const pending = overfill
    setOverfill(null)
    pending?.run(placement)
  }

  return (
    <>
      <AddPlayerSheet
        {...add.sheet}
        open={open}
        onOpenChange={onOpenChange}
        sessionTitle={s?.title ?? '…'}
        live={s?.state === 'active'}
        capacity={capacity}
        openSlots={Math.max(0, capacity - rosterList.length)}
        waitlistCount={waitlist.length}
        savedPlayers={savedPlayers}
        inSessionIds={inSessionIds}
        onConfirm={confirm}
        onSubmitNewPlayer={submitNewPlayer}
        isPending={isPending || session.isPending || roster.isPending || clubPlayers.isPending}
        serverError={
          add.serverError ??
          (session.error || roster.error || clubPlayers.error
            ? 'Could not load players. Close and reopen to retry.'
            : undefined)
        }
      />
      {s ? (
        <OverfillConfirm
          target={open && overfill ? { name: overfill.name } : null}
          session={s}
          rosterCount={rosterList.length}
          capacity={capacity}
          onCancel={() => setOverfill(null)}
          onAddToWaitlist={() => answer({ toWaitlist: true })}
          onAddAnyway={() => answer({ allowOverfill: true })}
        />
      ) : null}
    </>
  )
}

/** Saved players › Add player: saves to the club's saved players only, never to a session. */
function ClubAddPlayer({ open, onOpenChange }: AddPlayerProps) {
  const addDirectory = useAddDirectoryPlayerToClub()
  const addNew = useAddNewSavedPlayer()
  // "NAME is already in your saved players" is final for that pick: back to the list.
  const add = useAddSheet(open, (error) => error instanceof MockError && error.kind === 'conflict')

  const confirm = ({ candidate, level, name }: AddPlayerClubConfirmInput) => {
    if (!add.begin()) return
    addDirectory.mutate({ playerId: candidate.id, level, name }, add.options)
  }

  const setPicture = useSetClubPlayerPicture()
  const submitNewPlayer = (values: NewSavedPlayerFormValues, picture: ClubPictureChoice | null) => {
    if (!add.begin()) return
    addNew.mutate(
      {
        name: values.name,
        nickname: values.nickname,
        email: values.email,
        socialLink: values.socialLink,
        phone: values.phone,
        level: values.level,
      },
      {
        ...add.options,
        onSuccess: (result) => {
          add.options.onSuccess(result)
          // The picture chosen on New player is saved once the player exists (D-2026-11-09-12).
          if (!picture) return
          setPicture.mutate(
            picture.kind === 'photo'
              ? { clubPlayerId: result.data.clubPlayerId, kind: 'photo', file: picture.file }
              : {
                  clubPlayerId: result.data.clubPlayerId,
                  kind: 'character',
                  characterId: picture.characterId,
                },
            {
              onError: (error) =>
                toast.error(
                  `${values.name.trim()} was saved, but the picture wasn't: ${errorMessage(error)} Set it in Edit details.`,
                ),
            },
          )
        },
      },
    )
  }

  return (
    <AddPlayerSheet
      {...add.sheet}
      context="club"
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={confirm}
      onSubmitNewPlayer={submitNewPlayer}
      isPending={addDirectory.isPending || addNew.isPending}
      serverError={add.serverError}
    />
  )
}
