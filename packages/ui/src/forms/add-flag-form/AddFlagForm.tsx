'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Switch } from '@rotra/ui/switch'
import { TextInput } from '@rotra/ui/text-input'
import { Textarea } from '@rotra/ui/textarea'
import { useEffect, useId, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { addFlagDefaultValues } from './AddFlagForm.defaultValues'
import {
  type AddFlagFormInput,
  type AddFlagFormValues,
  createAddFlagSchema,
  suggestFlagKey,
} from './AddFlagForm.schema'

export type AddFlagFormProps = {
  /** Values to start from */
  defaultValues?: Partial<AddFlagFormInput>
  /** Every existing flag name (compared ignoring case and accents) */
  takenNames?: string[]
  /** Every existing flag key */
  takenKeys?: string[]
  /** Add flag: the values passed every check; the container saves the flag */
  onSubmit: (values: AddFlagFormValues) => void
  onCancel: () => void
  /** Adding: "Adding…", and the fields and buttons cannot be used */
  isPending?: boolean
  /** Why adding failed; nothing was saved and the typed values are kept */
  serverError?: string
  /**
   * True while the name, key or description holds text, so the container asks "Discard this flag?"
   * before closing (rotra-admin.html closeSheet)
   */
  onDirtyChange?: (dirty: boolean) => void
}

/**
 * A-ADD-FLAG: the Add feature flag sheet body. The key follows the name until it is edited by hand
 * and is fixed once saved. There is no field for which apps or behaviors a flag affects, and no
 * targeting, schedule or audience. Add flag submits to the container; it never saves.
 */
export function AddFlagForm({
  defaultValues,
  takenNames,
  takenKeys,
  onSubmit,
  onCancel,
  isPending = false,
  serverError,
  onDirtyChange,
}: AddFlagFormProps) {
  const formId = useId()
  const schema = useMemo(
    () => createAddFlagSchema({ takenNames, takenKeys }),
    [takenNames, takenKeys],
  )
  const form = useForm<AddFlagFormInput, unknown, AddFlagFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...addFlagDefaultValues, ...defaultValues },
  })
  const { errors, isSubmitted } = form.formState
  const watched = useWatch({ control: form.control })
  const dirty = [watched.name, watched.key, watched.description].some((value) =>
    Boolean(value?.trim()),
  )
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])
  // The key follows the name until it is edited by hand.
  const [keyEdited, setKeyEdited] = useState(
    () =>
      Boolean(defaultValues?.key) &&
      defaultValues?.key !== suggestFlagKey(defaultValues?.name ?? ''),
  )

  return (
    <div className="flex flex-col gap-3.5">
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSubmit(values)
        })}
      >
        <Field label="Name" error={errors.name?.message}>
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <TextInput
                {...field}
                placeholder="Session cost estimate"
                disabled={isPending}
                onChange={(event) => {
                  field.onChange(event)
                  if (!keyEdited)
                    form.setValue('key', suggestFlagKey(event.target.value), {
                      shouldDirty: true,
                      shouldValidate: isSubmitted,
                    })
                }}
              />
            )}
          />
        </Field>
        <Field
          label="Key"
          hint="What the apps' code checks. Lowercase letters, numbers and underscores. It can't be changed later."
          error={errors.key?.message}
        >
          <Controller
            control={form.control}
            name="key"
            render={({ field }) => (
              <TextInput
                {...field}
                className="font-mono"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={isPending}
                onChange={(event) => {
                  setKeyEdited(true)
                  field.onChange(event)
                }}
              />
            )}
          />
        </Field>
        <Field
          label="What it does"
          hint="Say what changes for people when it's on."
          error={errors.description?.message}
        >
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => <Textarea {...field} rows={3} disabled={isPending} />}
          />
        </Field>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <b>Turn on right away</b>
            <p className="m-0 text-[13px] text-fg2">
              Off by default, so you can add a flag before the feature is ready.
            </p>
          </div>
          <Controller
            control={form.control}
            name="on"
            render={({ field }) => (
              <Switch
                ref={field.ref}
                name={field.name}
                checked={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isPending}
                aria-label="Turn on right away"
              />
            )}
          />
        </div>
      </form>
      <Notice>
        A flag only changes something once the apps have code that reads its key. No flag can change
        confirmed results or bring back lost offline records.
      </Notice>
      {serverError ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-error">
          {serverError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" form={formId} variant="primary" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add flag'}
        </Button>
      </div>
    </div>
  )
}
