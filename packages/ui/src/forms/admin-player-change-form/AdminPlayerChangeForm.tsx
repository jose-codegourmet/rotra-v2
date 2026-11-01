'use client'
import type { AdminPlayer, AdminPlayerBulkResult } from '@rotra/data/admin-player/types'
import { Button } from '@rotra/ui/button'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { adminPlayerChangeDefaultValues } from './AdminPlayerChangeForm.defaultValues'
import { adminPlayerChangeSchema } from './AdminPlayerChangeForm.schema'
export type AdminPlayerChangeFormProps = {
  players: AdminPlayer[]
  action: 'archive' | 'restore' | 'remove'
  open: boolean
  onClose: () => void
  onSubmit: (reason: string, confirmations: Record<string, string>, ids: string[]) => void
  pending?: boolean
  offline?: boolean
  error?: string
  results?: AdminPlayerBulkResult[]
}
export function AdminPlayerChangeForm({
  players,
  action,
  open,
  onClose,
  onSubmit,
  pending,
  offline,
  error,
  results,
}: AdminPlayerChangeFormProps) {
  const form = useForm({ defaultValues: adminPlayerChangeDefaultValues }),
    values = form.watch(),
    failed = results?.filter((r) => !r.success)
  const selected = failed ? players.filter((p) => failed.some((r) => r.id === p.id)) : players
  const label = action === 'archive' ? 'Archive' : action === 'restore' ? 'Restore' : 'Remove'
  const valid =
    adminPlayerChangeSchema.safeParse(values).success &&
    (!results || !!failed?.length) &&
    selected.every(
      (p) => action !== 'remove' || (!p.removalReason && values.confirmations[p.id] === p.rtrId),
    )
  return (
    <FormProvider {...form}>
      <ConfirmSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose()
        }}
        title={`${label} ${players.length === 1 ? players[0]?.name : `${players.length} players`}`}
        consequence={
          action === 'remove'
            ? 'Permanent removal. This cannot be undone. Only unclaimed records with no games or retained references can be removed.'
            : action === 'archive'
              ? 'Hide from directories and club pickers. Sign-in and game history are kept. You can restore later.'
              : 'Return these players to directories and club pickers.'
        }
        confirmLabel={failed?.length ? 'Retry failed' : label}
        isPending={pending}
        destructive={action === 'remove'}
        confirmDisabled={!valid || offline}
        onConfirm={() =>
          onSubmit(
            values.reason,
            values.confirmations,
            selected.map((p) => p.id),
          )
        }
        error={error}
        summary={
          <div className="flex flex-col gap-3">
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <Field label="Reason">
                  <TextInput {...field} disabled={pending} />
                </Field>
              )}
            />
            {action === 'remove'
              ? selected.map((p) => (
                  <Controller
                    key={p.id}
                    control={form.control}
                    name={`confirmations.${p.id}`}
                    render={({ field }) => (
                      <Field label={`Type ${p.rtrId} to remove ${p.name}`}>
                        <TextInput {...field} value={field.value ?? ''} disabled={pending} />
                      </Field>
                    )}
                  />
                ))
              : null}
            {offline ? <p>You're offline. Reconnect to continue.</p> : null}
            {results ? (
              <div role="status">
                <p>
                  {results.filter((r) => r.success).length} succeeded, {failed?.length} failed
                </p>
                {failed?.map((r) => (
                  <p key={r.id}>
                    {players.find((p) => p.id === r.id)?.name ?? r.id}: {r.error}
                  </p>
                ))}
                {!failed?.length ? <Button onClick={onClose}>Done</Button> : null}
              </div>
            ) : null}
          </div>
        }
      />
    </FormProvider>
  )
}
