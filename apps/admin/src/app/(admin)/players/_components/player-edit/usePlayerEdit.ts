'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { OPEN_CONTACT_CHANGE_STATUSES } from '@rotra/data/contact-change-request/types'
import { useContactRequests } from '@rotra/data/contact-change-request/useContactRequests'
import { useSubmitAdminContactChange } from '@rotra/data/contact-change-request/useSubmitAdminContactChange'
import { MockError } from '@rotra/data/mock/errors'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import { adminEditEmailChanged } from '@rotra/ui/admin-edit-player-form'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

type ProfileUpdate = ReturnType<typeof useAdminPlayerMutations>['update']

/**
 * Edit profile (#564): name, nickname and photo save through the profile update as before; a new
 * email is sent for review as an Admin-entered contact-change request and never changes here. Both
 * use the same reason. A failure never shows success.
 */
export function usePlayerEdit(update: ProfileUpdate, playerId: string) {
  const email = useSubmitAdminContactChange()
  const requests = useContactRequests({ playerId }, { enabled: !!playerId })
  const [editingId, setEditingId] = useState<string>()
  /** The request was refused for the email itself (taken, same, open request, no contact record) */
  const emailError = email.error instanceof MockError ? email.error.fieldErrors?.email : undefined
  const reset = () => {
    update.reset()
    email.reset()
  }
  const submit = async (player: AdminPlayer, values: AdminPlayerEditValues, onDone: () => void) => {
    reset()
    setEditingId(player.id)
    const emailChanged = adminEditEmailChanged(player, values.email)
    // With no new email, Save profile saves as before, even when nothing else changed.
    const profileChanged =
      !emailChanged ||
      values.name !== player.name ||
      values.nickname !== (player.nickname ?? '') ||
      // Same prefill as the form: only an unclaimed player's https link is editable.
      values.picture !==
        (!player.claimed && player.picture?.startsWith('https://') ? player.picture : '')
    if (profileChanged) {
      try {
        const { email: _email, ...profile } = values
        await update.mutateAsync({ ...profile, id: player.id, revision: player.revision })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
        return
      }
    }
    if (!emailChanged) {
      toast.success('Profile updated')
      onDone()
      return
    }
    try {
      await email.mutateAsync({
        playerId: player.id,
        field: 'email',
        toValue: values.email,
        reason: values.reason,
        commandId: crypto.randomUUID(),
      })
    } catch (error) {
      if (profileChanged) toast.error("Profile saved, but the email change wasn't sent.")
      else toast.error(error instanceof Error ? error.message : String(error))
      return
    }
    toast.success(
      profileChanged
        ? 'Profile saved. Email change sent for review.'
        : 'Email change sent for review. Approve it on the Contact tab.',
    )
    onDone()
  }
  return {
    submit,
    reset,
    /** The player this edit was last sent for */
    editingId,
    isPending: update.isPending || email.isPending,
    emailError,
    /** A problem that isn't about the email field shows as the form's notice. */
    serverError:
      update.error?.message ?? (email.error && !emailError ? email.error.message : undefined),
    /** One open request at a time: a new email waits until it is reviewed on the Contact tab. */
    emailLocked:
      !requests.isPlaceholderData &&
      !!requests.data?.rows.some((request) =>
        OPEN_CONTACT_CHANGE_STATUSES.includes(request.status),
      ),
  }
}
