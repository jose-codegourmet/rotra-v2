'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Field } from '@rotra/ui/field'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { changePasswordDefaultValues } from './ChangePasswordForm.defaultValues'
import { type ChangePasswordValues, changePasswordSchema } from './ChangePasswordForm.schema'

export type ChangePasswordFormProps = {
  username: string
  onSubmit: (values: ChangePasswordValues) => void
  isPending?: boolean
  /** The mock or server rejected the current password: shown on that field, nothing is cleared */
  serverError?: string
  onSignOut: () => void
  /** Clears the fields after a successful change (the container bumps it) */
  resetKey?: number
}

const FIELDS = [
  ['current', 'Current password', 'current-password', undefined],
  ['next', 'New password', 'new-password', 'At least 8 characters.'],
  ['confirm', 'Confirm new password', 'new-password', undefined],
] as const

/** Club settings › Account: the username, Change password, and Sign out. */
export function ChangePasswordForm({
  username,
  onSubmit,
  isPending,
  serverError,
  onSignOut,
  resetKey,
}: ChangePasswordFormProps) {
  const id = useId()
  const [show, setShow] = useState(false)
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: changePasswordDefaultValues,
    mode: 'onSubmit',
  })
  const { errors } = form.formState
  const values = form.watch()
  const filled = Boolean(values.current && values.next && values.confirm)

  useEffect(() => {
    if (serverError) form.setError('current', { message: serverError }, { shouldFocus: true })
  }, [serverError, form])

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the signal to clear the fields
  useEffect(() => {
    if (resetKey !== undefined) form.reset(changePasswordDefaultValues)
  }, [resetKey])

  return (
    <Card asChild>
      <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
        <h2 id={`${id}-h`}>Account</h2>
        <KeyValueList
          items={[{ label: 'Username', value: <span className="font-mono">{username}</span> }]}
        />
        <FormProvider {...form}>
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={form.handleSubmit((v) => {
              if (!isPending) onSubmit(v)
            })}
          >
            <div>
              <h3>Change password</h3>
              <p className="m-0 text-[13px] text-fg2">
                Enter your current password to set a new one. It changes for every device that signs
                in to this club account.
              </p>
            </div>
            {FIELDS.map(([name, label, autoComplete, hint]) => (
              <Field
                key={name}
                label={label}
                hint={errors[name] ? undefined : hint}
                error={errors[name]?.message}
              >
                <Controller
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      type={show ? 'text' : 'password'}
                      autoComplete={autoComplete}
                      invalid={Boolean(errors[name])}
                    />
                  )}
                />
              </Field>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" disabled={!filled} loading={isPending}>
                Change password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-pressed={show}
                onClick={() => setShow((s) => !s)}
              >
                {show ? 'Hide passwords' : 'Show passwords'}
              </Button>
            </div>
            <p className="m-0 text-[13px] text-fg2">
              Forgot your current password? The ROTRA platform owner can reset it for you.
            </p>
          </form>
        </FormProvider>
        <div className="border-t border-border pt-3.5">
          <Button size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </section>
    </Card>
  )
}
