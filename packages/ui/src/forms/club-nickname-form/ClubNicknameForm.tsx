'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { NICKNAME_MAX } from '@rotra/schema/personal-details'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type RefObject, useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { clubNicknameDefaultValues } from './ClubNicknameForm.defaultValues'
import {
  type ClubNicknameFormInput,
  type ClubNicknameFormValues,
  clubNicknameSchema,
} from './ClubNicknameForm.schema'

export type ClubNicknameFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The player's full name: the title ("Club nickname for NAME") */
  name: string
  /** The player's current club nickname (prefill); null or absent when none */
  currentNickname?: string | null
  /** The nickname on their ROTRA account; null names "the name on their ROTRA account" instead */
  accountNickname: string | null
  /** Receives the trimmed nickname; '' removes the club nickname. The container saves it. */
  onSubmit: (values: ClubNicknameFormValues) => void
  /** Saving: nothing can be pressed and the sheet stays open */
  isPending?: boolean
  /** Why saving failed; the typed nickname stays */
  serverError?: string
  returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Club nickname (the prototype's SHEETS.clubNick): a small dialog "Club nickname for NAME" with one
 * optional field, a hint saying the session page, results and leaderboards keep the account
 * nickname, and Cancel / Save nickname. Saving it empty removes the club nickname.
 */
export function ClubNicknameForm({
  open,
  onOpenChange,
  name,
  currentNickname = null,
  accountNickname,
  onSubmit,
  isPending = false,
  serverError,
  returnFocusRef,
}: ClubNicknameFormProps) {
  const formId = useId()
  const firstName = name.split(' ')[0]
  const form = useForm<ClubNicknameFormInput, unknown, ClubNicknameFormValues>({
    resolver: zodResolver(clubNicknameSchema),
    defaultValues: clubNicknameDefaultValues(currentNickname),
  })
  const error = form.formState.errors.nickname?.message

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={`Club nickname for ${name}`}
      dismissible={!isPending}
      returnFocusRef={returnFocusRef}
      footer={
        <>
          <Button disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Save nickname
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSubmit(values)
        })}
      >
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <p className="m-0 text-[13px] text-fg2">
          What your club calls {firstName}. Only you see it: on the console, the roster and Saved
          players.
        </p>
        <Field
          label="Club nickname (optional)"
          error={error}
          hint={
            error
              ? undefined
              : `The session page, results and leaderboards show ${
                  accountNickname
                    ? `the nickname on their ROTRA account, “${accountNickname}”`
                    : 'the name on their ROTRA account'
                }. Leave this empty to use that here too.`
          }
        >
          <Controller
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <TextInput
                {...field}
                disabled={isPending}
                maxLength={NICKNAME_MAX}
                autoComplete="off"
                autoFocus
              />
            )}
          />
        </Field>
      </form>
    </Sheet>
  )
}
