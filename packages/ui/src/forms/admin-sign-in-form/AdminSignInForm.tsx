'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useRef } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { adminSignInDefaultValues } from './AdminSignInForm.defaultValues'
import { type AdminSignInValues, adminSignInSchema } from './AdminSignInForm.schema'

export type AdminSignInFormProps = {
  onSubmit: (values: AdminSignInValues) => void | Promise<unknown>
  isPending?: boolean
  serverError?: string
  sessionEnded?: boolean
  helpText?: ReactNode
  defaultValues?: Partial<AdminSignInValues>
}

export function AdminSignInForm({ onSubmit, isPending = false, serverError, sessionEnded, helpText, defaultValues }: AdminSignInFormProps) {
  const submitting = useRef(false)
  const form = useForm<AdminSignInValues>({
    resolver: zodResolver(adminSignInSchema),
    defaultValues: { ...adminSignInDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState
  return (
    <AuthCard title="Sign in" product="Admin" footer={helpText}>
      <FormProvider {...form}>
        <form noValidate className="flex flex-col gap-[18px]" onSubmit={(event) => {
          if (submitting.current || isPending) { event.preventDefault(); return }
          submitting.current = true
          void form.handleSubmit(async (values) => { await onSubmit(values) })(event).finally(() => { submitting.current = false })
        }}>
          {sessionEnded ? <Notice tone="warn" title="Your Admin session ended.">Sign in again to continue.</Notice> : null}
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          {errors.email && errors.password ? <Notice tone="error">Check the fields below and try again.</Notice> : null}
          <Field label="Email" error={errors.email?.message}>
            <Controller control={form.control} name="email" render={({ field }) => (
              <TextInput {...field} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={isPending} invalid={Boolean(errors.email)} />
            )} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Controller control={form.control} name="password" render={({ field }) => (
              <TextInput {...field} type="password" passwordVisibility autoComplete="current-password" disabled={isPending} invalid={Boolean(errors.password)} />
            )} />
          </Field>
          <Button type="submit" variant="primary" block disabled={isPending} aria-busy={isPending || undefined}>{isPending ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </FormProvider>
    </AuthCard>
  )
}
