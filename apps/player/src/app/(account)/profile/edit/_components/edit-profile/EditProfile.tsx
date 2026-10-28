'use client'
import { MockError } from '@rotra/data/mock/errors'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { useUpdateMyProfile } from '@rotra/data/player/useUpdateMyProfile'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { EditProfileForm } from '@rotra/ui/edit-profile-form'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { personalDetailsFromProfile } from '@rotra/ui/personal-details-fields/default-values'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'
import {
  clearLeave,
  requestLeave,
  selectPendingLeave,
  setUnsavedDraft,
} from '@/store/slices/uiSlice'
import { useContactChangeSheet } from '../../../_components/contact-change-sheet/useContactChangeSheet'

const SAVE_FAILED = "Couldn't save your profile. Your edits are still here. Try again."
const SAVE_OFFLINE =
  "You're offline, so nothing was saved. Your edits are still here; save again when you're connected."
/** Marks the extra history entry that lets the browser Back button open D-DISCARD. */
const GUARD_STATE = 'rotra-unsaved-profile'

export function EditProfile() {
  const account = useAppSelector(selectAccount)
  const playerId = account?.id ?? ''
  const profile = usePlayerProfile(playerId)
  const myAccount = useMyAccount(account ? playerId : null)
  const update = useUpdateMyProfile()
  // Opens over the edit page, so the profile draft stays.
  const contactChange = useContactChangeSheet(account ? playerId : null)
  const router = useRouter()
  const dispatch = useAppDispatch()
  const pendingLeave = useAppSelector(selectPendingLeave)
  const [dirty, setDirty] = useState(false)
  const [serverError, setServerError] = useState<string>()
  const profilePath = `/players/${playerId}`
  const defaultValues = useMemo(
    () => (profile.data ? personalDetailsFromProfile(profile.data) : undefined),
    [profile.data],
  )

  const onDirtyChange = useCallback(
    (next: boolean) => {
      setDirty(next)
      dispatch(setUnsavedDraft(next))
    },
    [dispatch],
  )
  useEffect(() => () => void dispatch(setUnsavedDraft(false)), [dispatch])

  // Browser Back with unsaved edits: an extra same-URL history entry absorbs the first Back and
  // opens D-DISCARD instead of leaving.
  const dirtyRef = useRef(false)
  const guarded = useRef(false)
  dirtyRef.current = dirty
  const armGuard = useCallback(() => {
    guarded.current = true
    window.history.pushState({ ...window.history.state, [GUARD_STATE]: true }, '')
  }, [])
  useEffect(() => {
    if (dirty && !guarded.current) armGuard()
  }, [dirty, armGuard])
  useEffect(() => {
    const onPop = () => {
      if (!guarded.current) return
      guarded.current = false
      // Edits were undone after arming: the guard entry was the only thing in the way.
      if (dirtyRef.current) dispatch(requestLeave('back'))
      else window.history.back()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dispatch])
  /** Leaves the form; replaces the guard entry so Back from the destination skips it. */
  const go = (href: string) => {
    const onGuard = guarded.current
    guarded.current = false
    if (onGuard) router.replace(href)
    else router.push(href)
  }

  const leave = (href: string) => (dirty ? dispatch(requestLeave(href)) : go(href))
  const keepEditing = () => {
    if (pendingLeave === 'back') armGuard()
    dispatch(clearLeave())
  }
  const discard = () => {
    const destination = pendingLeave ?? profilePath
    setDirty(false)
    dispatch(setUnsavedDraft(false))
    if (destination === 'back') {
      window.history.back()
      // Opened directly (a sign-in redirect or a shared link): there is no earlier page to return to.
      setTimeout(() => {
        if (window.location.pathname === '/profile/edit') router.replace(profilePath)
      }, 300)
    } else go(destination)
  }

  if (!account || profile.isPending || myAccount.isPending) {
    return (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
        <Card aria-busy="true" aria-label="Loading your profile">
          <Skeleton className="h-10" />
          <Skeleton className="mt-4 h-64" />
        </Card>
      </main>
    )
  }
  if (!profile.data || !myAccount.data || !defaultValues) {
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState
          title="Couldn't load your profile."
          onRetry={() => {
            void profile.refetch()
            void myAccount.refetch()
          }}
        >
          Check your connection, then try again.
        </ErrorState>
      </main>
    )
  }
  return (
    <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-1.5">
        <Button variant="ghost" size="sm" className="self-start" onClick={() => leave(profilePath)}>
          ← My profile
        </Button>
        <PageHeader
          title="Edit profile"
          description="Fields marked public appear on your profile for anyone to see."
        />
      </div>
      <EditProfileForm
        defaultValues={defaultValues}
        account={{
          phone: myAccount.data.phone,
          email: myAccount.data.email,
          playerId: profile.data.rtrId,
        }}
        isPending={update.isPending}
        serverError={serverError}
        onDirtyChange={onDirtyChange}
        onCancel={() => leave(profilePath)}
        onRequestContactChange={contactChange.openSheet}
        onOpenPhonePrivacy={() => leave('/profile/privacy-and-contact')}
        onSubmit={(values) => {
          setServerError(undefined)
          update.mutate(values, {
            onSuccess: () => {
              setDirty(false)
              dispatch(setUnsavedDraft(false))
              toast('Profile saved')
              go(profilePath)
            },
            onError: (error) => {
              const message =
                error instanceof MockError && error.kind === 'offline' ? SAVE_OFFLINE : SAVE_FAILED
              setServerError(message)
              toast.error(message)
            },
          })
        }}
      />
      <ConfirmSheet
        open={pendingLeave !== null}
        onOpenChange={(open) => {
          if (!open) keepEditing()
        }}
        title="Discard unsaved changes?"
        consequence="Your edits to your profile haven't been saved."
        backLabel="Keep editing"
        onBack={keepEditing}
        confirmLabel="Discard changes"
        destructive
        onConfirm={discard}
      />
      {contactChange.sheet}
    </main>
  )
}
