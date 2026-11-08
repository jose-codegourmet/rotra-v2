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
import { useEffect, useState } from 'react'
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
  /** A server problem with the new email (from the contact-change request); shown under Email */
  emailError?: string
  /** The player has an open contact-change request, so a new email can't be sent yet */
  emailLocked?: boolean
  onReload: () => void
}

const EMAIL_HINT =
  'A new email is sent for review as a contact-change request. The current email stays until the change is applied.'
const EMAIL_LOCKED_HINT =
  'This player has an open contact-change request. Review it on the Contact tab.'

/** Whether the form's email differs from the player's current one (trimmed, any case). */
export function adminEditEmailChanged(player: AdminPlayer, email: string) {
  return email.trim().toLowerCase() !== (player.email ?? '').trim().toLowerCase()
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
  emailError,
  emailLocked = false,
  onReload,
}: AdminEditPlayerFormProps) {
  const form = useForm({
      defaultValues: adminEditPlayerDefaultValues(p),
      resolver: zodResolver(adminEditPlayerSchema),
    }),
    [review, setReview] = useState<AdminPlayerEditValues | null>(null)
  // A rejected email goes back to the edit step with the message under Email.
  useEffect(() => {
    if (!emailError) return
    setReview(null)
    onReviewChange?.(false)
    form.setError('email', { type: 'server', message: emailError }, { shouldFocus: true })
  }, [emailError, form, onReviewChange])
  const content = (
    <FormProvider {...form}>
      <form
        id={embedded ? `admin-edit-player-${p.id}` : undefined}
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => {
          // An email can be replaced, not removed: clearing one is not a contact change.
          if (p.email && !values.email.trim()) {
            form.setError('email', {
              type: 'required',
              message: 'Enter an email address, like name@example.com.',
            })
            return
          }
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
            {adminEditEmailChanged(p, review.email) ? (
              <div className="flex flex-col gap-1">
                <ChangeCompare
                  fromLabel="Current email"
                  toLabel="New email"
                  from={p.email || 'Not set'}
                  to={review.email.trim().toLowerCase()}
                  emphasis="mono"
                />
                <p className="text-sm text-fg2">Sent for review · not changed yet</p>
              </div>
            ) : null}
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
              ['name', 'nickname', ...(p.claimed ? [] : ['picture']), 'email', 'reason'] as (
                | 'name'
                | 'nickname'
                | 'picture'
                | 'email'
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
                            : name === 'email'
                              ? 'Email'
                              : embedded
                                ? 'Reason for the change'
                                : 'Reason'
                    }
                    optional={name === 'nickname' || name === 'picture'}
                    hint={
                      name === 'email' ? (emailLocked ? EMAIL_LOCKED_HINT : EMAIL_HINT) : undefined
                    }
                    error={fieldState.error?.message}
                  >
                    <TextInput
                      {...field}
                      disabled={isPending || (name === 'email' && emailLocked)}
                      type={name === 'picture' ? 'url' : name === 'email' ? 'email' : 'text'}
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
              <p className="text-sm text-fg2">Phone, rank and the RTR ID cannot be edited here.</p>
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
