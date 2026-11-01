'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AdminPlayerCreateValues } from '@rotra/schema/admin-player'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Select } from '@rotra/ui/select'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { adminAddPlayerDefaultValues } from './AdminAddPlayerForm.defaultValues'
import { adminAddPlayerSchema } from './AdminAddPlayerForm.schema'
export type AdminAddPlayerFormProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: AdminPlayerCreateValues) => void
  isPending?: boolean
  offline?: boolean
  serverError?: string
  clubs: { id: string; name: string }[]
  places: { code: string; name: string }[]
}
export function AdminAddPlayerForm({
  open,
  onClose,
  onSubmit,
  isPending,
  offline,
  serverError,
  clubs,
  places,
}: AdminAddPlayerFormProps) {
  const form = useForm({
    defaultValues: adminAddPlayerDefaultValues,
    resolver: zodResolver(adminAddPlayerSchema),
  })
  const duplicate = serverError?.includes('Create anyway')
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v && !isPending) onClose()
      }}
      title="Add player"
      dismissible={!isPending}
    >
      <FormProvider {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) => onSubmit({ ...v, allowDuplicate: false }))}
        >
          {(['name', 'nickname', 'phone', 'email'] as const).map((name) => (
            <Controller
              key={name}
              control={form.control}
              name={name}
              render={({ field, fieldState }) => (
                <Field
                  label={
                    name === 'name' ? 'Full name' : name.charAt(0).toUpperCase() + name.slice(1)
                  }
                  optional={name !== 'name'}
                  error={fieldState.error?.message}
                >
                  <TextInput
                    {...field}
                    disabled={isPending}
                    type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}
                  />
                </Field>
              )}
            />
          ))}
          <Controller
            control={form.control}
            name="place"
            render={({ field, fieldState }) => (
              <Field label="Place" error={fieldState.error?.message}>
                <Select
                  {...field}
                  disabled={isPending}
                  options={places.map((p) => ({ value: p.code, label: p.name }))}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="clubId"
            render={({ field }) => (
              <Field label="Club" optional>
                <Select
                  value={field.value || 'none'}
                  onChange={(v) => field.onChange(v === 'none' ? '' : v)}
                  disabled={isPending}
                  options={[
                    { value: 'none', label: 'Created by Admin' },
                    ...clubs.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </Field>
            )}
          />
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          {offline ? <Notice>You're offline. Reconnect to add a player.</Notice> : null}
          <Button type="submit" variant="primary" disabled={offline} loading={isPending}>
            Add player
          </Button>
          {duplicate ? (
            <Button
              type="button"
              disabled={offline}
              loading={isPending}
              onClick={() =>
                void form.handleSubmit((v) => onSubmit({ ...v, allowDuplicate: true }))()
              }
            >
              Create anyway
            </Button>
          ) : null}
        </form>
      </FormProvider>
    </Sheet>
  )
}
