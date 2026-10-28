'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthCard } from '@rotra/ui/auth-card'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { useSubmitOnce } from '@rotra/ui/hooks/use-submit-once'
import { Notice } from '@rotra/ui/notice'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { forgotPasswordDefaultValues } from './ForgotPasswordForm.defaultValues'
import { type ForgotPasswordValues, forgotPasswordSchema } from './ForgotPasswordForm.schema'
export type ForgotPasswordFormProps = {
  onSubmit: (values: ForgotPasswordValues) => void
  onBack: () => void
  isPending?: boolean
  offline?: boolean
  serverError?: string
  defaultValues?: Partial<ForgotPasswordValues>
}
export function ForgotPasswordForm({
  onSubmit,
  onBack,
  isPending = false,
  offline = false,
  serverError,
  defaultValues,
}: ForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { ...forgotPasswordDefaultValues, ...defaultValues },
  })
  const submitOnce = useSubmitOnce(isPending)
  return (
    <AuthCard
      showBrand={false}
      back={
        <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
          ← Sign in
        </Button>
      }
      title="Reset your password"
      description="Enter the email on your ROTRA account. We'll send a link to set a new password."
    >
      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-[18px]"
          onSubmit={form.handleSubmit((values) => {
            if (!offline) submitOnce(() => onSubmit(values))
          })}
        >
          {offline || serverError ? (
            <Notice tone="error">
              {offline
                ? "Couldn't send because you're offline. Try again when you're connected."
                : serverError}
            </Notice>
          ) : null}
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <TextInput
                  {...field}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  disabled={isPending}
                />
              )}
            />
          </Field>
          <Button type="submit" variant="primary" block disabled={isPending || offline}>
            {isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </FormProvider>
    </AuthCard>
  )
}
