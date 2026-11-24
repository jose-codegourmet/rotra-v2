'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { takesClubPicture } from '@rotra/data/club-player/picture-rules'
import type { ClubPlayerDetails, ClubPlayerPictureState } from '@rotra/data/club-player/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { socialLinkKeys } from '@rotra/schema/social-link'
import { Button } from '@rotra/ui/button'
import { type ClubPictureChoice, ClubPictureField } from '@rotra/ui/club-picture-field'
import { Field } from '@rotra/ui/field'
import { GenderField } from '@rotra/ui/gender-field'
import { LevelSelect } from '@rotra/ui/level-select'
import { Notice } from '@rotra/ui/notice'
import { PersonalDetailsFields } from '@rotra/ui/personal-details-fields'
import { PhoneOrEmailInput } from '@rotra/ui/phone-or-email-input'
import type { PictureCharacter } from '@rotra/ui/profile-picture-sheet'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { useEffect, useId } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { editPlayerDetailsDefaultValues } from './EditPlayerDetailsForm.defaultValues'
import {
  type EditPlayerDetailsValues,
  editPlayerDetailsSchema,
} from './EditPlayerDetailsForm.schema'

const EMAIL_HINT_GUEST =
  "Add an email to save them as an unclaimed player. They get an RTR ID, and their games here follow them when they register. It can't be changed after you save. Never shown publicly."
const EMAIL_HINT_OLDER =
  "Check it with the player. It can't be changed after you save. Never shown publicly."

export type EditPlayerDetailsFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: ClubPlayerDetails
  onSubmit: (values: EditPlayerDetailsValues) => void
  isPending?: boolean
  /** A field problem shows under that field; anything else as a notice at the top */
  serverError?: { message: string; field?: 'fullName' | 'phone' | 'email' }
  /** The club-set picture; without it the Profile picture field is not shown. Not part of Save details */
  picture?: ClubPlayerPictureState
  /** Characters to choose from, eight per page; defaults to the eight illustrated faces */
  characters?: PictureCharacter[]
  /** A picture change applies at once: a photo file (cropped by the caller) or a character */
  onPictureChange?: (choice: ClubPictureChoice) => void
  onPictureRemove?: () => void
  onPicturePrevious?: () => void
  /** Shown under the field, e.g. "That image could not be read" */
  pictureError?: string
  picturePending?: boolean
}

/**
 * Q-SAVED-PLAYERS › Edit details for a guest or unclaimed profile. The club fills in what it knows so
 * the player's registration starts prefilled. An email on file is shown read-only; adding one to a
 * guest makes them unclaimed. Phone shows for unclaimed players only; one on file is never edited.
 */
export function EditPlayerDetailsForm({
  open,
  onOpenChange,
  details,
  onSubmit,
  isPending = false,
  serverError,
  picture,
  characters,
  onPictureChange,
  onPictureRemove,
  onPicturePrevious,
  pictureError,
  picturePending = false,
}: EditPlayerDetailsFormProps) {
  const formId = useId()
  const form = useForm<EditPlayerDetailsValues>({
    resolver: zodResolver(editPlayerDetailsSchema),
    defaultValues: editPlayerDetailsDefaultValues(details),
  })
  const errors = form.formState.errors
  const claim = details.identity === 'unclaimed'
  // D-2026-11-16-04: a saved email is read-only. An older unclaimed record has none: its Email field
  // looks required and the Details required notice shows.
  const emailOnFile = Boolean(details.profile?.email.trim())
  // #1019: a player saved with a social link and no email is not Details required.
  const detailsRequired =
    claim && !emailOnFile && socialLinkKeys(details.profile?.socialLinks).length === 0
  useEffect(() => {
    if (serverError?.field)
      form.setError(serverError.field, { type: 'server', message: serverError.message })
  }, [serverError, form])
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return
        onOpenChange(next)
      }}
      title={`Edit ${details.fullName}`}
      dismissible={!isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Save details
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id={formId}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {serverError && !serverError.field ? (
            <Notice tone="error">{serverError.message}</Notice>
          ) : null}
          {picture && takesClubPicture(details) ? (
            <ClubPictureField
              playerId={details.clubPlayerId}
              name={details.fullName}
              picture={picture}
              characters={characters}
              onChange={onPictureChange}
              onRemove={onPictureRemove}
              onUsePrevious={onPicturePrevious}
              error={pictureError}
              pending={picturePending || isPending}
            />
          ) : null}
          {detailsRequired ? (
            <Notice tone="warn" title="Details required.">
              An unclaimed player needs an email. Add their email here, or delete the player.
            </Notice>
          ) : claim ? (
            <Notice>
              What you fill in here is filled in for them when they open their invite link. They can
              still change it and only need to choose a password.
            </Notice>
          ) : null}
          <PersonalDetailsFields sections={['name']} disabled={isPending} />
          <Controller
            control={form.control}
            name="gender"
            render={({ field }) => (
              <GenderField value={field.value} onChange={field.onChange} disabled={isPending} />
            )}
          />
          <Field label="Level for this club" optional error={errors.level?.message}>
            <Controller
              control={form.control}
              name="level"
              render={({ field }) => (
                <LevelSelect
                  ref={field.ref}
                  name={field.name}
                  value={(field.value as PlayingLevel | '') || null}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isPending}
                />
              )}
            />
          </Field>
          {emailOnFile ? (
            <Field label="Email">
              <p className="m-0 text-sm">
                On file and kept private. It can't be changed here. Wrong email? Delete this player
                and add them again.
              </p>
            </Field>
          ) : (
            <Field
              label={claim ? 'Email' : 'Email (optional)'}
              error={errors.email?.message}
              hint={errors.email ? undefined : claim ? EMAIL_HINT_OLDER : EMAIL_HINT_GUEST}
            >
              <Controller
                control={form.control}
                name="email"
                render={({ field }) => (
                  <TextInput
                    {...field}
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="name@example.com"
                    disabled={isPending}
                  />
                )}
              />
            </Field>
          )}
          {claim ? (
            <>
              {details.phoneOnFile ? (
                <Field label="Phone">
                  <p className="m-0 text-sm">
                    On file and kept private. Not their number? Ask ROTRA to change it.
                  </p>
                </Field>
              ) : (
                <Field
                  label="Phone (optional)"
                  error={errors.phone?.message}
                  hint={errors.phone ? undefined : 'Kept private. Only your club sees it.'}
                >
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneOrEmailInput
                        {...field}
                        mode="phone"
                        placeholder="0917 555 0142"
                        disabled={isPending}
                      />
                    )}
                  />
                </Field>
              )}
              <PersonalDetailsFields sections={['playing-style', 'links']} disabled={isPending} />
            </>
          ) : null}
        </form>
      </FormProvider>
    </Sheet>
  )
}
