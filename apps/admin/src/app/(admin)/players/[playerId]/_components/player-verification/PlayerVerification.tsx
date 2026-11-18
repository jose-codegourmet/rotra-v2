'use client'

import type { AdminAccountVerification } from '@rotra/data/account-verification/types'
import { useAdminAccountVerification } from '@rotra/data/account-verification/useAdminAccountVerification'
import { useSetAdminVerificationOverride } from '@rotra/data/account-verification/useSetAdminVerificationOverride'
import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { ConflictError, MockError } from '@rotra/data/mock/errors'
import { AdminPlayerVerificationCard } from '@rotra/ui/admin-player-verification-card'
import { AdminVerificationOverrideForm } from '@rotra/ui/admin-verification-override-form'
import { toast } from '@rotra/ui/toaster'
import { useRef, useState } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'

export function PlayerVerification({ player }: { player: Pick<AdminPlayer, 'id' | 'name' | 'rtrId'> }) {
  const query = useAdminAccountVerification(player.id)
  const mutation = useSetAdminVerificationOverride()
  const { offline } = useAdminConnectivity()
  const denied = useDenyOnPermissionError(query.error, mutation.error)
  const [open, setOpen] = useState(false)
  const [verificationAtOpen, setVerificationAtOpen] = useState<AdminAccountVerification>()
  const [serverError, setServerError] = useState<string>()
  const submitting = useRef(false)

  const verification = query.data
  if (denied || verification === null) return null

  const openOverride = () => {
    if (!verification) return
    setVerificationAtOpen(verification)
    setServerError(undefined)
    setOpen(true)
  }

  const submit = (reason: string) => {
    if (!open || !verificationAtOpen || submitting.current) return
    if (offline) {
      setServerError(ADMIN_OFFLINE_ERROR)
      return
    }

    setServerError(undefined)
    submitting.current = true
    const verifiedByAdmin = !verificationAtOpen.verifiedByAdmin
    mutation.mutate(
      {
        playerId: player.id,
        revision: verificationAtOpen.revision,
        verifiedByAdmin,
        reason,
      },
      {
        onSuccess: () => {
          setOpen(false)
          toast.success(verifiedByAdmin ? 'Verified by Admin saved' : 'Verification override cleared')
        },
        onError: (error) => {
          setServerError(
            error instanceof MockError && error.kind === 'offline'
              ? ADMIN_OFFLINE_ERROR
              : 'Changes could not be saved',
          )
          if (error instanceof ConflictError) {
            const current = (error as ConflictError<AdminAccountVerification>).current
            // Refresh the summary without turning this attempt into the opposite action.
            if (current.verifiedByAdmin === verificationAtOpen.verifiedByAdmin) {
              setVerificationAtOpen(current)
            }
            void query.refetch()
          }
        },
        onSettled: () => {
          submitting.current = false
        },
      },
    )
  }

  return (
    <>
      <AdminPlayerVerificationCard
        verification={verification}
        onOpenOverride={openOverride}
        onRetry={query.isError ? () => void query.refetch() : undefined}
        retrying={query.isFetching}
      />
      {verificationAtOpen ? (
        <AdminVerificationOverrideForm
          open={open}
          onOpenChange={setOpen}
          playerName={player.name}
          rtrId={player.rtrId}
          completedSteps={verificationAtOpen.completedSteps}
          verifiedByAdmin={verificationAtOpen.verifiedByAdmin}
          onSubmit={({ reason }) => submit(reason)}
          isPending={mutation.isPending}
          serverError={serverError}
        />
      ) : null}
    </>
  )
}
