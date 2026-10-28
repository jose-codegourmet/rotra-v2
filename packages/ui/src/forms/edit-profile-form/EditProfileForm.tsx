'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatPhoneForDisplay } from '@rotra/schema/phone'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { Notice } from '@rotra/ui/notice'
import {
  PersonalDetailsFields,
  type PersonalDetailsSection,
} from '@rotra/ui/personal-details-fields'
import { useEffect, useId, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { editProfileDefaultValues } from './EditProfileForm.defaultValues'
import { type EditProfileValues, editProfileSchema } from './EditProfileForm.schema'
import { SectionNav } from './section-nav/SectionNav'

type SectionId = PersonalDetailsSection | 'account'
type Section = { id: SectionId; label: string; intro: string; keys: (keyof EditProfileValues)[] }
const SECTIONS: [Section, ...Section[]] = [
  {
    id: 'name',
    label: 'Name',
    intro: 'How you appear on the leaderboard and your profile.',
    keys: ['fullName', 'nickname'],
  },
  {
    id: 'playing-style',
    label: 'Playing style',
    intro: 'Help clubs and other players know your game.',
    keys: ['playingStyle', 'experienceYears', 'experienceMonths'],
  },
  {
    id: 'links',
    label: 'Links',
    intro: 'Social pages shown on your profile.',
    keys: ['facebook', 'instagram', 'youtube', 'linkedin'],
  },
  {
    id: 'account',
    label: 'Account',
    intro: 'Private details you sign in with, and your permanent player ID.',
    keys: [],
  },
]

export type EditProfileFormProps = {
  defaultValues?: EditProfileValues
  /** Read-only; never form fields and never in the submitted values */
  account: { phone: string; email: string; playerId: string }
  onSubmit: (values: EditProfileValues) => void
  isPending?: boolean
  serverError?: string
  onCancel: () => void
  onRequestContactChange: () => void
  onOpenPhonePrivacy: () => void
  /** Lets the container guard navigation away from unsaved edits */
  onDirtyChange?: (dirty: boolean) => void
}
/** P-EDIT-PROFILE: one shared draft across four sections and one Save changes. */
export function EditProfileForm({
  defaultValues = editProfileDefaultValues,
  account,
  onSubmit,
  isPending = false,
  serverError,
  onCancel,
  onRequestContactChange,
  onOpenPhonePrivacy,
  onDirtyChange,
}: EditProfileFormProps) {
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues,
    shouldFocusError: false,
  })
  const { errors, dirtyFields, isDirty } = form.formState
  const [selected, setSelected] = useState<SectionId>('name')
  const [focusKey, setFocusKey] = useState<keyof EditProfileValues | null>(null)
  const submitted = useRef(false)
  const baseId = useId()
  const panelId = `${baseId}-panel`
  const tabIdPrefix = `${baseId}-tab`

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])
  // A finished attempt (saved, failed or offline) allows the next deliberate submit.
  useEffect(() => {
    if (!isPending) submitted.current = false
  }, [isPending])
  useEffect(() => {
    if (focusKey) {
      form.setFocus(focusKey)
      setFocusKey(null)
    }
  }, [focusKey, form])

  const section = SECTIONS.find((entry) => entry.id === selected) ?? SECTIONS[0]
  const errorCount = (keys: (keyof EditProfileValues)[]) => keys.filter((key) => errors[key]).length
  const failing = SECTIONS.filter((entry) => errorCount(entry.keys))
  const submit = form.handleSubmit(
    (values) => {
      if (submitted.current || isPending) return
      submitted.current = true
      onSubmit(values)
    },
    (invalid) => {
      const first = SECTIONS.find((entry) => entry.keys.some((key) => invalid[key]))
      const key = first?.keys.find((entry) => invalid[entry])
      if (first && key) {
        setSelected(first.id)
        setFocusKey(key)
      }
    },
  )
  return (
    <FormProvider {...form}>
      <div className="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-5 max-[720px]:grid-cols-[minmax(0,1fr)] max-[720px]:gap-3">
        <SectionNav
          items={SECTIONS.map((entry) => ({
            id: entry.id,
            label: entry.label,
            errorCount: errorCount(entry.keys),
            dirty: entry.keys.some((key) => dirtyFields[key]),
          }))}
          selectedId={section.id}
          onSelect={(id) => setSelected(id as SectionId)}
          panelId={panelId}
          tabIdPrefix={tabIdPrefix}
        />
        <Card asChild>
          <form
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-${section.id}`}
            noValidate
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <h2>{section.label}</h2>
              <p className="text-sm text-fg2">{section.intro}</p>
            </div>
            {serverError ? <Notice tone="error">{serverError}</Notice> : null}
            {failing.length ? (
              <Notice tone="error">
                Some details need fixing: {failing.map((entry) => entry.label).join(', ')}.
              </Notice>
            ) : null}
            {section.id === 'account' ? (
              <>
                <KeyValueList
                  items={[
                    {
                      label: 'Phone',
                      value: (
                        <span className="font-mono">{formatPhoneForDisplay(account.phone)}</span>
                      ),
                    },
                    {
                      label: 'Email',
                      value: account.email || <span className="text-fg2">Not added</span>,
                    },
                    {
                      label: 'Player ID',
                      value: <span className="font-mono">{account.playerId}</span>,
                    },
                  ]}
                />
                <p className="text-sm text-fg2">
                  You can't edit these here. Phone and email changes go to the ROTRA platform owner
                  for approval; your player ID never changes.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={onRequestContactChange}>
                    Request a phone or email change
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onOpenPhonePrivacy}>
                    Phone privacy
                  </Button>
                </div>
                <p className="text-xs text-fg2">
                  Rank, club levels and game results come from clubs and can't be changed by
                  players.
                </p>
              </>
            ) : (
              <PersonalDetailsFields sections={[section.id]} disabled={isPending} />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5 max-[720px]:sticky max-[720px]:bottom-0 max-[720px]:-mx-4 max-[720px]:-mb-4 max-[720px]:rounded-b-lg max-[720px]:bg-surface max-[720px]:px-4 max-[720px]:pt-3 max-[720px]:pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
              <span className="text-sm text-fg2" aria-live="polite">
                {isDirty ? 'Unsaved changes' : 'No changes yet'}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </FormProvider>
  )
}
