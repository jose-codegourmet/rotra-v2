'use client'
import type { AdminPlayer, AdminPlayerBulkResult } from '@rotra/data/admin-player/types'
import { Button } from '@rotra/ui/button'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { RadioChoiceList } from '@rotra/ui/radio-choice-list'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { adminPlayerGenderDefaultValues } from './AdminPlayerGenderForm.defaultValues'
import { adminPlayerGenderSchema } from './AdminPlayerGenderForm.schema'

export type AdminPlayerGenderFormProps = {
  players: AdminPlayer[]
  open: boolean
  onClose: () => void
  /** `null` is Not given. `ids` are the players still to save (all of them, or only the failed). */
  onSubmit: (gender: 'male' | 'female' | null, ids: string[]) => void
  pending?: boolean
  offline?: boolean
  error?: string
  results?: AdminPlayerBulkResult[]
}

export function AdminPlayerGenderForm({
  players,
  open,
  onClose,
  onSubmit,
  pending,
  offline,
  error,
  results,
}: AdminPlayerGenderFormProps) {
  const form = useForm({ defaultValues: adminPlayerGenderDefaultValues }),
    values = form.watch(),
    failed = results?.filter((r) => !r.success)
  const selected = failed ? players.filter((p) => failed.some((r) => r.id === p.id)) : players
  const parsed = adminPlayerGenderSchema.safeParse(values)
  const valid = parsed.success && (!results || !!failed?.length)
  return (
    <FormProvider {...form}>
      <ConfirmSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose()
        }}
        title={`Set gender for ${players.length === 1 ? players[0]?.name : `${players.length} players`}`}
        consequence="Applies to every selected player, registered or not. Players can still change their own gender in Edit profile."
        confirmLabel={failed?.length ? 'Retry failed' : 'Set gender'}
        isPending={pending}
        confirmDisabled={!valid || offline}
        onConfirm={() => {
          if (!parsed.success) return
          onSubmit(
            parsed.data.gender === 'none' ? null : parsed.data.gender,
            selected.map((p) => p.id),
          )
        }}
        error={error}
        summary={
          <div className="flex flex-col gap-3">
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <RadioChoiceList
                  aria-label="Gender"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={pending}
                  choices={[
                    { value: 'male', title: 'Male' },
                    { value: 'female', title: 'Female' },
                    { value: 'none', title: 'Not given' },
                  ]}
                />
              )}
            />
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
