'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { normalizeRtrId } from '@rotra/data/player/rtr-id'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Notice } from '@rotra/ui/notice'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type RefObject, useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { slotTransferDefaultValues } from './SlotTransferForm.defaultValues'
import {
  type SlotTransferFormInput,
  type SlotTransferFormValues,
  slotTransferSchema,
} from './SlotTransferForm.schema'

/** The player found for the typed RTR ID */
export type SlotTransferRecipient = {
  name: string
  rtrId: string
  photoUrl?: string
  /** Their place on this session's waitlist (1 = next), or null when they are not waitlisted */
  waitlistPosition: number | null
}

export type SlotTransferFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Nov 9, 7:30 PM": when the session starts (transfers close then) */
  startsLabel: string
  /** Find: the container looks the RTR ID up and passes `recipient` or `findError` back */
  onFind: (values: SlotTransferFormValues) => void
  /** The player found for the last Find; cleared by the container when the RTR ID changes */
  recipient?: SlotTransferRecipient | null
  /** Why Find found nobody, or why they cannot take the slot */
  findError?: string
  isFinding?: boolean
  /** Send transfer request for the found recipient's RTR ID */
  onSubmit: (values: SlotTransferFormValues) => void
  /** The typed RTR ID changed: the container clears the found recipient */
  onRtrIdChange?: () => void
  isPending?: boolean
  serverError?: string
  /**
   * Create a transfer link (#1012) for a recipient with no ROTRA account; omit to hide the option.
   * The container makes the link and opens TransferLinkSheet with it.
   */
  onCreateLink?: () => void
  isCreatingLink?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Transfer my slot (#1011, the prototype's SHEETS.slotTransfer): the signed-in confirmed player
 * types the full RTR ID of another registered ROTRA player, taps Find, checks the name, then
 * Send transfer request. The Queue Master approves or rejects; nothing changes before that.
 * No ROTRA account? Create a transfer link instead (#1012): a single-claim link they sign up with.
 */
export function SlotTransferForm({
  open,
  onOpenChange,
  startsLabel,
  onFind,
  recipient = null,
  findError,
  isFinding = false,
  onSubmit,
  onRtrIdChange,
  isPending = false,
  serverError,
  onCreateLink,
  isCreatingLink = false,
  returnFocusRef,
}: SlotTransferFormProps) {
  const formId = useId()
  const form = useForm<SlotTransferFormInput, unknown, SlotTransferFormValues>({
    resolver: zodResolver(slotTransferSchema),
    defaultValues: slotTransferDefaultValues,
  })
  const typed = normalizeRtrId(form.watch('rtrId') ?? '')
  const found = recipient && recipient.rtrId === typed ? recipient : null
  const busy = isPending || isFinding || isCreatingLink
  const error = form.formState.errors.rtrId?.message ?? findError

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!isPending && !isCreatingLink) onOpenChange(next)
      }}
      title="Transfer my slot"
      dismissible={!isPending && !isCreatingLink}
      returnFocusRef={returnFocusRef}
      footer={
        <>
          <Button disabled={isPending || isCreatingLink} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={isPending}
            disabled={!found || isFinding || isCreatingLink}
          >
            Send transfer request
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={form.handleSubmit((values) => {
          if (!busy && found) onSubmit(values)
        })}
      >
        {serverError ? <Notice tone="error">{serverError}</Notice> : null}
        <p className="m-0 text-[13px] text-fg2">
          Give your slot to another ROTRA player. The Queue Master approves it before the session
          starts ({startsLabel}); until then you keep your slot. Requests still waiting at the start
          close.
        </p>
        <Field
          label="Their RTR ID"
          error={error}
          hint={error ? undefined : 'Ask them for the RTR ID on their ROTRA profile.'}
        >
          <Controller
            control={form.control}
            name="rtrId"
            render={({ field }) => (
              <TextInput
                {...field}
                onChange={(event) => {
                  field.onChange(event)
                  onRtrIdChange?.()
                }}
                disabled={isPending}
                placeholder="RTR-PH-CEB-102926-0001"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
              />
            )}
          />
        </Field>
        <Button
          type="button"
          disabled={busy}
          loading={isFinding}
          onClick={form.handleSubmit((values) => {
            if (!busy) onFind(values)
          })}
        >
          Find
        </Button>
        {found ? (
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-bg p-3">
            <Avatar name={found.name} src={found.photoUrl} />
            <div className="flex min-w-0 flex-1 flex-col">
              <b className="[overflow-wrap:anywhere]">{found.name}</b>
              <span className="font-mono text-[13px] text-fg2">{found.rtrId}</span>
              <span className="text-[13px] text-fg2">
                {found.waitlistPosition
                  ? `On the waitlist #${found.waitlistPosition} · leaves the waitlist if approved`
                  : 'Not in this session yet'}
              </span>
            </div>
          </div>
        ) : null}
        {onCreateLink ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3.5">
            <b className="text-sm">No ROTRA account yet?</b>
            <p className="m-0 text-[13px] text-fg2">
              Make a transfer link instead. They sign up or log in with it, and the first person to
              claim it gets your slot once the Queue Master approves. It stops working at the start.
            </p>
            <Button
              type="button"
              disabled={busy}
              loading={isCreatingLink}
              onClick={() => {
                if (!busy) onCreateLink()
              }}
            >
              Create a transfer link
            </Button>
          </div>
        ) : null}
      </form>
    </Sheet>
  )
}
