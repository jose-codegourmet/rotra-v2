'use client'
import type { AdminPlayerEdit } from '@rotra/data/admin-player/types'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import {
  type AdminPlayerPictureCharacter,
  type AdminPlayerPictureChoice,
  AdminPlayerPictureSection,
} from '@rotra/ui/admin-player-picture-section'
import { Button } from '@rotra/ui/button'
import { ExperienceFields, playingSinceOf } from '@rotra/ui/experience-fields'
import { Field } from '@rotra/ui/field'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { Switch } from '@rotra/ui/switch'
import { TextInput, type TextInputProps } from '@rotra/ui/text-input'
import { Textarea } from '@rotra/ui/textarea'
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { adminEditPlayerDefaultValues } from './AdminEditPlayerForm.defaultValues'
import { adminEditPlayerChanged, adminEditPlayerResolver } from './AdminEditPlayerForm.schema'

/** A form field a server error can name (MockError fieldErrors keys). */
export type AdminEditPlayerField = keyof AdminPlayerEditValues

export type AdminEditPlayerFormProps = {
  /** The loaded A-PLAYER-EDIT record; the form starts from it and compares against it */
  player: AdminPlayerEdit
  /** Shown library images only, in upload order (the picker's 8 per page) */
  characters: AdminPlayerPictureCharacter[]
  /**
   * The image of a `character:<id>` that is not in `characters` (a hidden or deleted library image
   * the player still uses). Without it, legacy references fall back to the built-in faces.
   */
  characterImage?: (id: string) => string | undefined
  /**
   * Crops an accepted upload (PNG, JPG or WebP, up to 1 MB) to the centred square data URL the
   * draft holds; rejects when the file can't be read as an image. The caller owns cropping, as
   * ClubPictureField's caller does.
   */
  cropPhoto: (file: File) => Promise<string>
  /** Read-only "Created by": the club that first saved the player, or 'Admin' */
  createdBy: string
  /** The form element id, so the enclosing panel's footer can submit it */
  formId?: string
  /** Save changes with every value valid and something changed (phone as E.164, trimmed) */
  onSubmit: (values: AdminPlayerEditValues) => void
  /** Save changes with nothing changed: "Nothing changed." (nothing is sent). Without it, onSubmit is called and the data layer answers it. */
  onNothingChanged?: () => void
  /** Saving: every control is off. Offline is the container's toast (the data layer refuses the save). */
  isPending?: boolean
  /** A problem that is not about one field (stale revision, not found, network) */
  serverError?: string
  /** Field errors from the data layer (MockError fieldErrors): shown inline, the first is focused */
  fieldErrors?: Partial<Record<AdminEditPlayerField, string>>
  /** Opens the full photo (PhotoViewer, #716) of the picture in the Profile picture section */
  onViewPicture?: (src: string) => void
  /** Shown with a stale-revision serverError ("… Reload before editing.") */
  onReload?: () => void
}

/** The prototype's order of errors (peErrors() + reason), which is also the order on screen. */
const ERROR_ORDER: AdminEditPlayerField[] = [
  'picture',
  'name',
  'nickname',
  'playingStyle',
  'experienceYears',
  'experienceMonths',
  'facebook',
  'instagram',
  'youtube',
  'linkedin',
  'profilePrivate',
  'phoneHidden',
  'phone',
  'email',
  'password',
  'reason',
]

const SINCE_YEAR_ERROR = 'Use a year like 2022.'

const LINKS = [
  ['facebook', 'Facebook', 'https://facebook.com/name'],
  ['instagram', 'Instagram', 'https://instagram.com/name'],
  ['youtube', 'YouTube', 'https://youtube.com/@channel'],
  ['linkedin', 'LinkedIn', 'https://linkedin.com/in/name'],
] as const

const formatDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-PH', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
const formatAt = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/** The prototype's .pic-sec: a ruled block with an uppercase label. */
function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-2.5 border-t border-border pt-2.5">
      {label ? (
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">{label}</span>
      ) : null}
      {children}
    </section>
  )
}

/** The prototype's .fgrid: as many 200 px columns as fit, one on a phone. */
const GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5'

/**
 * A-PLAYER-EDIT (rotra-admin.html › Players › Quick view › Edit): everything a player can change,
 * plus phone, email and the beta-only password, with one Reason and Save changes. Presentational:
 * the container saves, toasts and closes.
 *
 * Password *(for MVP or beta only)*: D-2026-11-09-14 amends D-2026-11-07-01 for the beta only; end
 * date not set. The field is dropped when the date is set.
 */
export function AdminEditPlayerForm({
  player: p,
  characters,
  characterImage,
  cropPhoto,
  createdBy,
  formId = `admin-edit-player-${p.id}`,
  onSubmit,
  onNothingChanged,
  isPending = false,
  serverError,
  fieldErrors,
  onReload,
  onViewPicture,
}: AdminEditPlayerFormProps) {
  const form = useForm({
    defaultValues: adminEditPlayerDefaultValues(p),
    resolver: adminEditPlayerResolver(p),
    shouldFocusError: false,
  })
  const formRef = useRef<HTMLFormElement>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  // Playing since is not a form value; its year is checked on save (rotra-admin.html peErrors()).
  const since = useRef(
    playingSinceOf({
      years: form.getValues('experienceYears'),
      months: form.getValues('experienceMonths'),
    }),
  )
  const [sinceYearError, setSinceYearError] = useState<string>()
  const checkSinceYear = () => {
    const year = since.current.year.trim()
    const ok =
      year === '' ||
      (/^\d+$/.test(year) && Number(year) >= 1950 && Number(year) <= new Date().getFullYear())
    setSinceYearError(ok ? undefined : SINCE_YEAR_ERROR)
    return ok
  }
  const errors = form.formState.errors
  const [years, months, picture] = useWatch({
    control: form.control,
    name: ['experienceYears', 'experienceMonths', 'picture'],
  })

  // Focus the first field showing an error, in screen order, once it has rendered.
  useEffect(() => {
    if (!focusRequest) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusRequest])

  // Field errors from the data layer (format, uniqueness, reason) show next to their fields.
  useEffect(() => {
    if (!fieldErrors) return
    const keys = ERROR_ORDER.filter((key) => fieldErrors[key])
    for (const key of keys) form.setError(key, { type: 'server', message: fieldErrors[key] })
    if (keys.length) setFocusRequest((n) => n + 1)
  }, [fieldErrors, form])

  const choiceOf = (reference: string | null): AdminPlayerPictureChoice => {
    if (!reference) return { kind: 'initials' }
    if (!reference.startsWith('character:')) return { kind: 'photo', src: reference }
    const id = reference.slice('character:'.length)
    const image =
      characters.find((c) => c.id === id)?.image ??
      characterImage?.(id) ??
      profilePictureSrc(reference, p.id, p.name) ??
      ''
    return { kind: 'character', id, image }
  }
  const setPicture = (value: string | null) => {
    form.setValue('picture', value, { shouldDirty: true })
    form.clearErrors('picture')
  }
  const claimed = p.claimed
  const disabled = isPending

  const submit = form.handleSubmit(
    (values) => {
      if (!checkSinceYear()) return setFocusRequest((n) => n + 1)
      if (!adminEditPlayerChanged(p, values) && onNothingChanged) return onNothingChanged()
      onSubmit(values)
    },
    () => {
      checkSinceYear()
      setFocusRequest((n) => n + 1)
    },
  )

  const text = (
    name: Exclude<
      AdminEditPlayerField,
      'picture' | 'profilePrivate' | 'phoneHidden' | 'experienceYears' | 'experienceMonths'
    >,
    label: string,
    input: TextInputProps & { hint?: ReactNode } = {},
  ) => {
    const { hint, ...props } = input
    return (
      <Controller
        name={name}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field label={label} hint={hint} error={fieldState.error?.message}>
            <TextInput {...field} autoComplete="off" disabled={disabled} {...props} />
          </Field>
        )}
      />
    )
  }
  const toggle = (name: 'profilePrivate' | 'phoneHidden', title: string, sub: string) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3.5 rounded-lg border border-border px-3.5 py-3">
            <div className="flex flex-col gap-1.5">
              <b>{title}</b>
              <span className="text-sm text-fg2">{sub}</span>
            </div>
            <Switch
              aria-label={title}
              checked={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
            />
          </div>
          {fieldState.error ? (
            <span className="text-[13px] font-semibold text-error">{fieldState.error.message}</span>
          ) : null}
        </div>
      )}
    />
  )

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        id={formId}
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => void submit(event)}
      >
        <p className="text-sm text-fg2">
          As the platform owner you can change everything a player can, plus their sign-in details.
          Every save is recorded with your reason.
        </p>
        <AdminPlayerPictureSection
          name={p.name}
          picture={choiceOf(picture)}
          savedPicture={choiceOf(p.picture)}
          previousPicture={p.previousPicture === null ? null : choiceOf(p.previousPicture)}
          characters={characters}
          onUpload={async (file) => setPicture(await cropPhoto(file))}
          onUseInitials={() => setPicture(null)}
          onUsePrevious={() => setPicture(p.previousPicture)}
          onPickCharacter={(id) => setPicture(`character:${id}`)}
          onView={onViewPicture}
          error={errors.picture?.message}
          disabled={disabled}
        />
        <Section label="Name">
          <div className={GRID}>
            {text('name', 'Full name')}
            {text('nickname', 'Nickname', { hint: 'Optional' })}
          </div>
        </Section>
        <Section label="Playing style">
          <Controller
            name="playingStyle"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                label="Playing style"
                hint="Optional. How they play, in a sentence or two."
                error={fieldState.error?.message}
              >
                <Textarea {...field} rows={3} maxLength={280} disabled={disabled} />
              </Field>
            )}
          />
          <ExperienceFields
            value={{ years, months }}
            onChange={(next) => {
              form.setValue('experienceYears', next.years, { shouldDirty: true })
              form.setValue('experienceMonths', next.months, { shouldDirty: true })
              form.clearErrors(['experienceYears', 'experienceMonths'])
            }}
            yearsLabel="Experience, years"
            monthsLabel="Experience, months"
            sinceYearError={sinceYearError}
            onSinceChange={(next) => {
              since.current = next
              setSinceYearError(undefined)
            }}
            yearsError={errors.experienceYears?.message}
            monthsError={errors.experienceMonths?.message}
            disabled={disabled}
          />
        </Section>
        <Section label="Links">
          <div className={GRID}>
            {LINKS.map(([name, label, example]) => (
              <Fragment key={name}>
                {text(name, label, { type: 'url', inputMode: 'url', placeholder: example })}
              </Fragment>
            ))}
          </div>
        </Section>
        <Section label="Privacy">
          {toggle(
            'profilePrivate',
            'Private profile',
            "Guests don't see this player's ROTRA profile. Signed-in players still do.",
          )}
          {toggle(
            'phoneHidden',
            'Hide phone number from clubs',
            'Clubs find the player by RTR ID or QR code instead.',
          )}
        </Section>
        <Section label="Account">
          <div className={GRID}>
            {text('phone', 'Phone', {
              type: 'tel',
              inputMode: 'tel',
              className: 'font-mono',
              placeholder: '+63 9XX XXX XXXX',
            })}
            {text('email', 'Email', { type: 'email', inputMode: 'email', className: 'font-mono' })}
          </div>
          <p className="text-xs text-fg2">
            {claimed
              ? 'The player signs in with these. Changing them here applies straight away, without a contact-change request.'
              : "The club entered these. The player hasn't registered yet."}
          </p>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                label="Password *(for MVP or beta only)*"
                hint={
                  claimed
                    ? "Replaces the player's password. For manual recovery until players can reset it themselves. Leave empty to keep it. Give the new password to the player yourself; it isn't shown again."
                    : "This player hasn't registered, so there's no password to replace."
                }
                error={fieldState.error?.message}
              >
                <TextInput
                  {...field}
                  type="password"
                  passwordVisibility
                  autoComplete="new-password"
                  disabled={disabled || !claimed}
                  placeholder={
                    claimed ? 'Leave empty to keep the current password' : 'Not registered yet'
                  }
                />
              </Field>
            )}
          />
          <KeyValueList
            items={[
              {
                label: 'RTR ID',
                value: p.rtrId ? (
                  <span className="font-mono">{p.rtrId}</span>
                ) : (
                  'Not registered yet'
                ),
              },
              { label: 'Created by', value: createdBy },
              {
                label: 'Account',
                value: claimed
                  ? p.registeredOn
                    ? `Registered ${formatDay(p.registeredOn)}`
                    : 'Registered'
                  : 'Unclaimed',
              },
              { label: 'Rank', value: p.rankStatus.text },
              {
                label: 'Recent matches',
                value: `${p.recentStandardMatches} in the last three months`,
              },
              ...(p.passwordSetAt
                ? [{ label: 'Password', value: `Last set by Admin ${formatAt(p.passwordSetAt)}` }]
                : []),
            ]}
          />
          <p className="text-sm text-fg2">
            These stay read-only. The RTR ID never changes. Rank, level and match counts come from
            finished club sessions, and Admin can't change ranks, winners or scores. A profile
            becomes registered only when the player claims it.
          </p>
        </Section>
        <Section>
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field label="Reason for the change" error={fieldState.error?.message}>
                <Textarea
                  {...field}
                  rows={3}
                  maxLength={300}
                  placeholder="Required. Saved in the record of actions."
                  disabled={disabled}
                />
              </Field>
            )}
          />
        </Section>
        {serverError ? (
          <Notice tone="error">
            {serverError}
            {onReload && serverError.includes('Reload') ? (
              <Button type="button" onClick={onReload}>
                Reload player
              </Button>
            ) : null}
          </Notice>
        ) : null}
      </form>
    </FormProvider>
  )
}
