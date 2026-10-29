'use client'

import type { AdminClubDetail } from '@rotra/data/club/types'
import {
  defaultLicenseDraft,
  formatLicenseDate,
  licenseEffects,
  manilaToday,
  overlapDays,
  planPriceMinor,
  termEnd,
} from '@rotra/data/license/rules'
import type { ClubLicenseTerm, LicenseOperation } from '@rotra/data/license/types'
import { useActivateLicense } from '@rotra/data/license/useActivateLicense'
import { useCheckLicenseOperation } from '@rotra/data/license/useCheckLicenseOperation'
import { MockError } from '@rotra/data/mock/errors'
import { LicenseForm } from '@rotra/ui/forms/license-form'
import { licenseStatusLine } from '@rotra/ui/forms/license-form/helpers'
import type { LicenseFormInput, LicenseFormValues } from '@rotra/ui/forms/license-form/schema'
import { LicenseOperationNotice } from '@rotra/ui/license-operation-notice'
import { LicenseReview } from '@rotra/ui/license-review'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { type ReactNode, useEffect, useRef, useState } from 'react'

export type LicenseSheetProps = {
  club: AdminClubDetail
  /** The club's recorded terms (useLicenseTerms); the details step starts from them */
  terms: readonly ClubLicenseTerm[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Verb = 'Activate' | 'Renew'

/** rotra-admin.html licCheck(): the term was not recorded, so the same review can be saved again. */
const NOT_SAVED = "It wasn't saved. You can save it again."

/** The prototype's licStart() values as the form's field text (amount in whole pesos). */
function formInputFrom(
  draft: ReturnType<typeof defaultLicenseDraft>,
  isFree: boolean,
): Partial<LicenseFormInput> {
  return {
    plan: draft.plan ?? '',
    startsOn: draft.startsOn,
    paidOn: draft.paidOn,
    amount: !isFree && draft.amountMinor ? String(draft.amountMinor / 100) : '',
    reference: draft.reference,
  }
}

/** Checked values → what the fields start from when coming Back (amount back to peso text). */
function formInputFromValues(values: LicenseFormValues, today: string): Partial<LicenseFormInput> {
  return {
    plan: values.plan,
    startsOn: values.startsOn,
    paidOn: values.paidOn ?? today,
    amount: values.paidOn === null ? '' : String(values.amountMinor / 100),
    reference: values.reference,
  }
}

/**
 * A-LICENSE / D-LICENSE: record an activation or renewal the club paid for outside ROTRA. Details
 * (LicenseForm, prefilled with defaultLicenseDraft) → review (LicenseReview with the term end,
 * effects and overlap from the license rules) → save over useActivateLicense. The sourceCommandId is
 * generated on entering review and reused by every save of that review, so a retry never records a
 * second term. A lost reply (MockError 'timeout') shows LicenseOperationNotice, with no way to close
 * the sheet, until Check status finds the term (close, toast) or reports it wasn't saved (back to
 * review with the error).
 */
export function LicenseSheet({ club, terms, open, onOpenChange }: LicenseSheetProps) {
  const activate = useActivateLicense()
  const check = useCheckLicenseOperation()
  const [values, setValues] = useState<LicenseFormValues | null>(null)
  const [draft, setDraft] = useState<Partial<LicenseFormInput> | undefined>(undefined)
  const [timedOut, setTimedOut] = useState(false)
  const [notSaved, setNotSaved] = useState(false)
  // Activate or Renew as the review was entered: a lost reply can record the term (and flip
  // hasTerms) while the notice is still up.
  const [frozenVerb, setFrozenVerb] = useState<Verb | null>(null)
  // One command ID per review: the idempotency key activateLicense and Check status look up.
  const commandId = useRef<string | null>(null)
  const { reset: resetActivate } = activate
  const { reset: resetCheck } = check

  // Every opening starts from the club's current terms and price; nothing from an earlier entry stays.
  useEffect(() => {
    if (open) {
      setValues(null)
      setDraft(undefined)
      setTimedOut(false)
      setNotSaved(false)
      setFrozenVerb(null)
      commandId.current = null
      resetActivate()
      resetCheck()
    }
  }, [open, resetActivate, resetCheck])

  const today = manilaToday()
  const isFree = club.licensePricing === 'free'
  const verb: Verb = frozenVerb ?? (club.hasTerms ? 'Renew' : 'Activate')
  // While saving or after a lost reply the sheet can't be closed: the term may already be recorded.
  const locked = activate.isPending || check.isPending || timedOut

  const close = () => {
    if (locked) return
    onOpenChange(false)
    setValues(null)
    setDraft(undefined)
    activate.reset()
    check.reset()
  }

  const done = (operation: LicenseOperation, found: boolean) => {
    onOpenChange(false)
    setValues(null)
    setDraft(undefined)
    setTimedOut(false)
    const until = formatLicenseDate(operation.term.endsAt)
    const verbText = operation.verb.toLowerCase()
    toast(
      found
        ? `Found it: license ${verbText} until ${until}. Nothing was added twice.`
        : `License ${verbText} until ${until}.`,
    )
  }

  const review = (checked: LicenseFormValues) => {
    commandId.current = crypto.randomUUID()
    activate.reset()
    setNotSaved(false)
    setFrozenVerb(club.hasTerms ? 'Renew' : 'Activate')
    setValues(checked)
  }

  const back = () => {
    if (!values || activate.isPending) return
    setDraft(formInputFromValues(values, today))
    setValues(null)
    setNotSaved(false)
    activate.reset()
  }

  const save = () => {
    if (!values || activate.isPending) return
    const sourceCommandId = commandId.current ?? crypto.randomUUID()
    commandId.current = sourceCommandId
    setNotSaved(false)
    activate.mutate(
      {
        clubId: club.id,
        plan: values.plan,
        startsOn: values.startsOn,
        paidOn: values.paidOn,
        amountMinor: values.amountMinor,
        reference: values.reference,
        sourceCommandId,
      },
      {
        onSuccess: (operation) => done(operation, false),
        onError: (error) => {
          if (error instanceof MockError && error.kind === 'timeout') setTimedOut(true)
          else toast.error(error.message)
        },
      },
    )
  }

  const checkStatus = () => {
    const sourceCommandId = commandId.current
    if (!sourceCommandId || check.isPending) return
    check.mutate(sourceCommandId, {
      onSuccess: (operation) => {
        if (operation) {
          done(operation, true)
          return
        }
        activate.reset()
        setTimedOut(false)
        setNotSaved(true)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  let body: ReactNode
  if (timedOut) {
    body = (
      <LicenseOperationNotice
        verb={verb}
        clubName={club.name}
        onCheck={checkStatus}
        isChecking={check.isPending}
      />
    )
  } else if (values) {
    body = (
      <LicenseReview
        verb={verb}
        club={{ name: club.name, username: club.username }}
        plan={values.plan}
        startsOn={values.startsOn}
        endsOn={termEnd(values.startsOn, values.plan)}
        payment={
          values.paidOn === null ? null : { amountMinor: values.amountMinor, paidOn: values.paidOn }
        }
        planPriceMinor={planPriceMinor(club, values.plan)}
        reference={values.reference}
        effects={licenseEffects(club, club.access, club.retention, values, today)}
        overlapDays={overlapDays(club.access, values)}
        onBack={back}
        onConfirm={save}
        isPending={activate.isPending}
        serverError={notSaved ? NOT_SAVED : activate.error?.message}
      />
    )
  } else {
    body = (
      <LicenseForm
        club={{
          name: club.name,
          initials: club.initials,
          logoUrl: club.logoUrl,
          accent: club.accent,
        }}
        statusLine={licenseStatusLine(club.access)}
        isActive={club.access.state === 'active'}
        prices={{
          monthlyMinor: club.licenseMonthlyMinor,
          yearlyMinor: club.licenseYearlyMinor,
          isFree,
        }}
        defaultValues={draft ?? formInputFrom(defaultLicenseDraft(club, terms, today), isFree)}
        getTermEnd={termEnd}
        today={today}
        onSubmit={review}
        onCancel={close}
      />
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title={`${verb} license`}
      hideClose={locked}
      dismissible={!locked}
    >
      {body}
    </Sheet>
  )
}
