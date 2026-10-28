'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { resetPasswordDefaultValues } from './ResetPasswordForm.defaultValues'
import { type ResetPasswordValues, resetPasswordSchema } from './ResetPasswordForm.schema'
export type ResetPasswordFormProps = {
  onSubmit: (values: ResetPasswordValues) => void
  isPending?: boolean
  offline?: boolean
  serverError?: string
  defaultValues?: Partial<ResetPasswordValues>
}
export function ResetPasswordForm({
  onSubmit,
  isPending = false,
  offline = false,
  serverError,
  defaultValues,
}: ResetPasswordFormProps) {
  const [shown, setShown] = useState(false)
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { ...resetPasswordDefaultValues, ...defaultValues },
  })
  return (
    <AuthCard showBrand={false} title="Set a new password">
      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-[18px]"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending && !offline) onSubmit(values)
          })}
        >
          {offline || serverError ? (
            <Notice tone="error">
              {offline
                ? "Couldn't save because you're offline. Try again when you're connected."
                : serverError}
            </Notice>
          ) : null}
          <Field label="New password" error={form.formState.errors.password?.message}>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    type={shown ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isPending}
                  />
                )}
              />
              <Button
                size="sm"
                className="shrink-0"
                aria-pressed={shown}
                aria-label={shown ? 'Hide passwords' : 'Show passwords'}
                disabled={isPending}
                onClick={() => setShown((value) => !value)}
              >
                {shown ? 'Hide' : 'Show'}
              </Button>
            </div>
          </Field>
          <Field
            label="Confirm new password"
            error={form.formState.errors.confirmPassword?.message}
          >
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <TextInput
                  {...field}
                  type={shown ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={isPending}
                />
              )}
            />
          </Field>
          <Button type="submit" variant="primary" block disabled={isPending || offline}>
            {isPending ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      </FormProvider>
    </AuthCard>
  )
}
