'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import { Button } from '@rotra/ui/button'
import { ChangeCompare } from '@rotra/ui/change-compare'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { adminEditPlayerDefaultValues } from './AdminEditPlayerForm.defaultValues'
import { adminEditPlayerSchema } from './AdminEditPlayerForm.schema'
export type AdminEditPlayerFormProps = {
  player: AdminPlayer
  /** Render inside an existing Sheet, preserving the shared edit/review flow. */
  embedded?: boolean
  /** The enclosing panel renders the Review changes submit button in its footer. */
  externalActions?: boolean
  onReviewChange?: (reviewing: boolean) => void
  open: boolean
  onClose: () => void
  onSubmit: (values: AdminPlayerEditValues) => void
  isPending?: boolean
  offline?: boolean
  serverError?: string
  onReload: () => void
}
export function AdminEditPlayerForm({
  player: p,
  embedded = false,
  externalActions = false,
  onReviewChange,
  open,
  onClose,
  onSubmit,
  isPending,
  offline,
  serverError,
  onReload,
}: AdminEditPlayerFormProps) {
  const form = useForm({
      defaultValues: adminEditPlayerDefaultValues(p),
      resolver: zodResolver(adminEditPlayerSchema),
    }),
    [review, setReview] = useState<AdminPlayerEditValues | null>(null)
  const content = (
    <FormProvider {...form}>
      <form
        id={embedded ? `admin-edit-player-${p.id}` : undefined}
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => {
          setReview(values)
          onReviewChange?.(true)
        })}
      >
        {review ? (
          <>
            {(
              ['name', 'nickname', ...(p.claimed ? [] : ['picture'])] as (
                | 'name'
                | 'nickname'
                | 'picture'
              )[]
            ).map((key) => (
              <ChangeCompare
                key={key}
                fromLabel={`Current ${key}`}
                toLabel={`New ${key}`}
                from={p[key] || 'Not set'}
                to={review[key] || 'Not set'}
              />
            ))}
            <p>Reason: {review.reason}</p>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                setReview(null)
                onReviewChange?.(false)
              }}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={offline}
              loading={isPending}
              onClick={() => onSubmit(review)}
            >
              Save profile
            </Button>
          </>
        ) : (
          <>
            {(
              ['name', 'nickname', ...(p.claimed ? [] : ['picture']), 'reason'] as (
                | 'name'
                | 'nickname'
                | 'picture'
                | 'reason'
              )[]
            ).map((name) => (
              <Controller
                key={name}
                name={name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    label={
                      name === 'name'
                        ? 'Full name'
                        : name === 'picture'
                          ? embedded
                            ? 'Profile photo (link)'
                            : 'Profile photo URL'
                          : name === 'nickname'
                            ? 'Nickname'
                            : embedded
                              ? 'Reason for the change'
                              : 'Reason'
                    }
                    optional={name === 'nickname' || name === 'picture'}
                    error={fieldState.error?.message}
                  >
                    <TextInput
                      {...field}
                      disabled={isPending}
                      type={name === 'picture' ? 'url' : 'text'}
                    />
                  </Field>
                )}
              />
            ))}
            {embedded && p.claimed ? (
              <p className="text-sm text-fg2">
                This player is registered, so they change their own photo.
              </p>
            ) : null}
            {embedded ? (
              <p className="text-sm text-fg2">
                Phone, email, rank and the RTR ID can't be edited here. Contact changes go through a
                request.
              </p>
            ) : null}
            <Button
              className={externalActions ? 'hidden' : undefined}
              type="submit"
              disabled={offline || isPending}
              loading={isPending}
            >
              Review changes
            </Button>
          </>
        )}
        {serverError ? (
          <Notice tone="error">
            {serverError}
            {serverError.includes('Reload') ? (
              <Button type="button" onClick={onReload}>
                Reload player
              </Button>
            ) : null}
          </Notice>
        ) : null}
        {offline ? <Notice>You're offline. Reconnect to save.</Notice> : null}
      </form>
    </FormProvider>
  )
  if (embedded) return content
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v && !isPending) onClose()
      }}
      title={`Edit profile · ${p.name}`}
      dismissible={!isPending}
    >
      {content}
    </Sheet>
  )
}
