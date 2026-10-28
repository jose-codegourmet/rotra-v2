'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { TextInput } from '@rotra/ui/text-input'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { inventoryItemDefaultValues } from './InventoryItemForm.defaultValues'
import {
  type InventoryItemFormInput,
  type InventoryItemFormValues,
  inventoryItemSchema,
} from './InventoryItemForm.schema'

export type InventoryItemFormProps = {
  mode: 'add' | 'edit'
  defaultValues?: Partial<InventoryItemFormInput>
  onSubmit: (values: InventoryItemFormValues) => void
  isPending?: boolean
  serverError?: string
  onCancel: () => void
}
export function InventoryItemForm({
  mode,
  defaultValues,
  onSubmit,
  isPending,
  serverError,
  onCancel,
}: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormInput, unknown, InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: { ...inventoryItemDefaultValues, ...defaultValues },
  })
  const { errors } = form.formState
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSubmit(values)
        })}
      >
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <Field label="Name" error={errors.name?.message}>
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <TextInput {...field} placeholder="e.g. XP2" disabled={isPending} />
            )}
          />
        </Field>
        <Field label="Category" error={errors.category?.message}>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <SegmentedControl
                aria-label="Category"
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
                options={[
                  { value: 'shuttlecocks', label: 'Shuttlecocks' },
                  { value: 'equipment', label: 'Equipment' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            )}
          />
        </Field>
        <Field label="Unit" error={errors.unit?.message}>
          <Controller
            control={form.control}
            name="unit"
            render={({ field }) => (
              <TextInput {...field} placeholder="tube, piece, case" disabled={isPending} />
            )}
          />
        </Field>
        <div className="grid gap-4 min-[521px]:grid-cols-2">
          <Field label="In stock" error={errors.stock?.message}>
            <Controller
              control={form.control}
              name="stock"
              render={({ field }) => (
                <TextInput
                  {...field}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={isPending}
                />
              )}
            />
          </Field>
          <Field label="Cost per unit (₱)" error={errors.unitCostMinor?.message}>
            <Controller
              control={form.control}
              name="unitCostMinor"
              render={({ field }) => (
                <TextInput
                  {...field}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={isPending}
                />
              )}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {mode === 'add' ? 'Add item' : 'Save item'}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
