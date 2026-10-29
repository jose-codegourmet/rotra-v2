'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { ClubPriceFields } from '@rotra/ui/forms/club-price-fields'
import { Notice } from '@rotra/ui/notice'
import { Select } from '@rotra/ui/select'
import { SheetSteps } from '@rotra/ui/sheet-steps'
import { TextInput } from '@rotra/ui/text-input'
import { useId, useMemo, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { addClubDefaultValues } from './AddClubForm.defaultValues'
import {
  type AddClubFormInput,
  type AddClubFormValues,
  createAddClubSchema,
  plainText,
} from './AddClubForm.schema'

/** A founding city choice; its code goes into the RTR IDs of players the club creates. */
export type AddClubCity = { code: string; name: string }

export type AddClubFormProps = {
  /** Values to start from, e.g. everything kept when coming Back from the review step */
  defaultValues?: Partial<AddClubFormInput>
  /** Founding cities offered in the Founding city select */
  cities: AddClubCity[]
  /** Every existing club name (compared ignoring case and accents) */
  takenNames?: string[]
  /** Every username already used by an account (compared ignoring case and accents) */
  takenUsernames?: string[]
  /** Review: the values passed every check; the container shows the review step */
  onSubmit: (values: AddClubFormValues) => void
  onCancel: () => void
  /** Accepted for symmetry with the review step; Review is disabled while it is true */
  isPending?: boolean
  serverError?: string
}

const SECTION_LABEL = 'text-xs font-semibold tracking-[0.5px] text-fg2 uppercase'
const STEPS = ['Details', 'Review']
const STOP_WORDS = ['club', 'the', 'of', 'and']
// rotra-admin.html genPass(): no look-alike characters (no i, l, o, I, O, 0 or 1).
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
const GENERATED_LENGTH = 12

/** rotra-admin.html slugOf(): the first two words of the name, without filler words, joined by a dot. */
export function suggestUsername(name: string) {
  return plainText(name)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.includes(word))
    .slice(0, 2)
    .join('.')
}

/** rotra-admin.html genPass(): 12 random characters from crypto.getRandomValues. */
function generatePassword() {
  const random = new Uint32Array(GENERATED_LENGTH)
  crypto.getRandomValues(random)
  return Array.from(random, (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join('')
}

/**
 * A-ADD-CLUB step 1: the club's details, its Queue app sign-in and its price. Review submits to the
 * container, which shows AddClubReview. It never saves anything.
 */
export function AddClubForm({
  defaultValues,
  cities,
  takenNames,
  takenUsernames,
  onSubmit,
  onCancel,
  isPending = false,
  serverError,
}: AddClubFormProps) {
  const formId = useId()
  const passwordId = useId()
  const schema = useMemo(
    () => createAddClubSchema({ takenNames, takenUsernames }),
    [takenNames, takenUsernames],
  )
  const form = useForm<AddClubFormInput, unknown, AddClubFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...addClubDefaultValues, ...defaultValues },
  })
  const { errors, isSubmitted } = form.formState
  const [showPassword, setShowPassword] = useState(false)
  // The username follows the club name until it is edited by hand.
  const [usernameEdited, setUsernameEdited] = useState(
    () =>
      Boolean(defaultValues?.username) &&
      defaultValues?.username !== suggestUsername(defaultValues?.name ?? ''),
  )
  const cityOptions = cities.map((city) => ({
    value: city.code,
    label: `${city.name} (${city.code})`,
  }))

  return (
    <div className="flex flex-col gap-3.5">
      <SheetSteps steps={STEPS} current={0} />
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            if (!isPending) onSubmit(values)
          })}
        >
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <span className={SECTION_LABEL}>Club</span>
          <Field label="Club name" error={errors.name?.message}>
            <Controller
              control={form.control}
              name="name"
              render={({ field }) => (
                <TextInput
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    if (!usernameEdited)
                      form.setValue('username', suggestUsername(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: isSubmitted,
                      })
                  }}
                />
              )}
            />
          </Field>
          <Field
            label="Founding address"
            hint="Where the club was founded. Sessions can be held at other venues."
            error={errors.foundingAddress?.message}
          >
            <Controller
              control={form.control}
              name="foundingAddress"
              render={({ field }) => <TextInput {...field} placeholder="Street, district" />}
            />
          </Field>
          <Field
            label="Founding city"
            hint="Sets the city code in the RTR IDs of players this club creates. It can't be changed later."
            error={errors.cityCode?.message}
          >
            <Controller
              control={form.control}
              name="cityCode"
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={cityOptions}
                  placeholder="Choose a city"
                  invalid={Boolean(errors.cityCode)}
                />
              )}
            />
          </Field>
          <span className={`${SECTION_LABEL} pt-1.5`}>Sign-in for the Queue app</span>
          <Field
            label="Username"
            hint="Lowercase letters, numbers and dots, like lahug.smash. One shared account runs the club and its queue."
            error={errors.username?.message}
          >
            <Controller
              control={form.control}
              name="username"
              render={({ field }) => (
                <TextInput
                  {...field}
                  className="font-mono"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => {
                    setUsernameEdited(true)
                    field.onChange(event)
                  }}
                />
              )}
            />
          </Field>
          <Field id={passwordId} label="Password" error={errors.password?.message}>
            <div className="relative">
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-[76px]"
                    aria-describedby={[
                      `${passwordId}-rule`,
                      errors.password ? `${passwordId}-error` : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                )}
              />
              <Button
                size="xs"
                variant="ghost"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((show) => !show)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="xs"
                onClick={() => {
                  form.setValue('password', generatePassword(), {
                    shouldDirty: true,
                    shouldValidate: isSubmitted,
                  })
                  setShowPassword(true)
                }}
              >
                Generate a password
              </Button>
              <span id={`${passwordId}-rule`} className="text-xs text-fg2">
                At least 8 characters.
              </span>
            </div>
          </Field>
          <span className={`${SECTION_LABEL} pt-1.5`}>Price</span>
          <ClubPriceFields />
        </form>
      </FormProvider>
      <div className="flex flex-wrap justify-end gap-2.5 [&>*]:flex-auto">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" form={formId} variant="primary" disabled={isPending}>
          Review
        </Button>
      </div>
    </div>
  )
}
