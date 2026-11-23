'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { ClubPlayerPictureState } from '@rotra/data/club-player/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { NICKNAME_MAX } from '@rotra/schema/personal-details'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { type ClubPictureChoice, ClubPictureField } from '@rotra/ui/club-picture-field'
import { cn } from '@rotra/ui/cn'
import { CountStepper } from '@rotra/ui/count-stepper'
import { Field } from '@rotra/ui/field'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { Sheet } from '@rotra/ui/sheet'
import { TextInput } from '@rotra/ui/text-input'
import { type ReactNode, useEffect, useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { editLivePlayerDefaultValues } from './EditLivePlayerSheet.defaultValues'
import {
  EDIT_LIVE_GAMES_MAX,
  EDIT_LIVE_GAMES_MIN,
  type EditLivePlayerFormInput,
  type EditLivePlayerFormValues,
  editLivePlayerSchema,
} from './EditLivePlayerSheet.schema'

export type EditLivePlayerKind = 'registered' | 'unclaimed' | 'guest'

export type EditLivePlayerPicture = {
  /** Club player id: seeds the eight characters */
  playerId: string
  picture: ClubPlayerPictureState
  /** Picture changes apply at once (as Edit details): the container calls the picture mutation */
  onChange: (choice: ClubPictureChoice) => void
  onRemove: () => void
  onUsePrevious: () => void
  pending?: boolean
  error?: string
}

export type EditLivePlayerSheetProps = {
  open: boolean
  /** The one name the card shows: the club nickname, else the account nickname, else the full name */
  shownName: string
  /** The player's full name; shown under the shown name when it differs */
  fullName: string
  kind: EditLivePlayerKind
  /** The level locked for this session; null draws the neutral ring and "No level yet" */
  level: PlayingLevel | null
  /** Picture URL for the header (the level ring is drawn around it) */
  photoUrl?: string
  /** Tonight's state chip: in a match (Playing / On court) or off court (Present / Not here follows `present`) */
  match?: { status: 'playing' | 'oncourt'; courtLabel: string } | null
  /** Registered players: their current club nickname (prefill) and the nickname on their ROTRA account */
  clubNickname?: string | null
  accountNickname?: string | null
  /** The games played the card shows now ("Now N") */
  games: number
  /** Whether they are present now */
  present: boolean
  /** Unclaimed players only: the picture editor from Edit details */
  picture?: EditLivePlayerPicture
  /** Save changes: the parent saves and closes on success; nothing is claimed as saved here */
  onSave: (values: EditLivePlayerFormValues) => void
  /** Cancel, Escape, the scrim and × */
  onCancel: () => void
  /** The save is running: the primary shows a spinner and nothing else can be pressed */
  isPending?: boolean
  /** Why saving failed; the edits stay */
  error?: ReactNode
}

const RING = {
  beginner: '[--ring:var(--lv-beg)]',
  intermediate: '[--ring:var(--lv-int)]',
  advanced: '[--ring:var(--lv-adv)]',
  none: '[--ring:var(--border-strong)]',
} as const

const KIND_LABEL = { registered: 'Registered', unclaimed: 'Unclaimed', guest: 'Guest' } as const
const GAMES_COPY = 'Auto Queue, Catch Up and fewest-games sorting use the new count right away.'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-3 border-t border-border pt-3.5"
    >
      <h3 id={id} className="m-0 text-xs font-bold tracking-[0.5px] text-fg2 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * D-EDIT-LIVE-PLAYER (owner comments, November 19, 2026): **Edit NAME** from the pencil on a live
 * Players card. A header (picture in its level ring, the shown name, the full name when it
 * differs, chips for level, account kind and tonight's state), a **Profile** section (club
 * nickname for registered players, the picture editor for unclaimed players; left out for a guest)
 * and a **Tonight** section (Games played with "Now N", Availability Present · Not here).
 * Cancel / Save changes; no confirmation step.
 */
export function EditLivePlayerSheet({
  open,
  shownName,
  fullName,
  kind,
  level,
  photoUrl,
  match = null,
  clubNickname = null,
  accountNickname = null,
  games,
  present,
  picture,
  onSave,
  onCancel,
  isPending = false,
  error,
}: EditLivePlayerSheetProps) {
  const formId = useId()
  const profileId = useId()
  const nightId = useId()
  const gamesLabelId = useId()
  const form = useForm<EditLivePlayerFormInput, unknown, EditLivePlayerFormValues>({
    resolver: zodResolver(editLivePlayerSchema),
    defaultValues: editLivePlayerDefaultValues({ clubNickname, games, present }),
  })
  // Start from the player's current values each time the sheet opens.
  useEffect(() => {
    if (open) form.reset(editLivePlayerDefaultValues({ clubNickname, games, present }))
  }, [open, clubNickname, games, present, form.reset])

  const band = level ? (level.split('_')[0] as 'beginner' | 'intermediate' | 'advanced') : 'none'
  const watched = form.watch()
  const nicknameError = form.formState.errors.nickname?.message
  const tonight = match ? (
    <Chip tone="accent">
      {match.status === 'oncourt' ? 'On court' : 'Playing'} · {match.courtLabel}
    </Chip>
  ) : present ? (
    <Chip>Present</Chip>
  ) : (
    <Chip tone="warn">Not here</Chip>
  )
  const showProfile = kind === 'registered' || (kind === 'unclaimed' && picture)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onCancel()
      }}
      title={`Edit ${shownName}`}
      dismissible={!isPending}
      hideClose={isPending}
      footer={
        <>
          <Button disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex min-w-0 flex-col gap-3.5"
        onSubmit={form.handleSubmit((values) => {
          if (!isPending) onSave(values)
        })}
      >
        <div className={cn('flex min-w-0 items-center gap-3.5', RING[band])}>
          <Avatar
            name={fullName}
            src={photoUrl}
            size={52}
            className="flex-none outline-3 outline-offset-[3px] outline-(--ring)"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[17px] leading-[1.2] font-extrabold [overflow-wrap:anywhere]">
              {shownName}
            </span>
            {shownName !== fullName ? (
              <span className="text-[13px] text-fg2">{fullName}</span>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip>{levelLabel(level)}</Chip>
              <Chip>{KIND_LABEL[kind]}</Chip>
              {tonight}
            </div>
          </div>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        {showProfile ? (
          <Section id={profileId} title="Profile">
            {kind === 'registered' ? (
              <Field
                label="Club nickname (optional)"
                error={nicknameError}
                hint={
                  nicknameError
                    ? undefined
                    : `What your club calls them. Only your club sees it. Empty uses ${
                        accountNickname
                          ? `“${accountNickname}”, the nickname on their ROTRA account`
                          : 'the name on their ROTRA account'
                      }.`
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
                    />
                  )}
                />
              </Field>
            ) : picture ? (
              <ClubPictureField
                playerId={picture.playerId}
                name={fullName}
                picture={picture.picture}
                onChange={picture.onChange}
                onRemove={picture.onRemove}
                onUsePrevious={picture.onUsePrevious}
                pending={picture.pending || isPending}
                error={picture.error}
              />
            ) : null}
          </Section>
        ) : null}

        <Section id={nightId} title="Tonight">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <b id={gamesLabelId} className="text-sm">
                Games played
              </b>
              <span className="text-[13px] text-fg2">
                Now {games}
                {watched.games !== games ? ` · will be ${watched.games}` : ''}
              </span>
            </div>
            <Controller
              control={form.control}
              name="games"
              render={({ field }) => (
                <CountStepper
                  ref={field.ref}
                  value={field.value}
                  min={EDIT_LIVE_GAMES_MIN}
                  max={EDIT_LIVE_GAMES_MAX}
                  onChange={field.onChange}
                  decrementLabel="One game fewer"
                  incrementLabel="One game more"
                  disabled={isPending}
                  size="lg"
                />
              )}
            />
          </div>
          <span className="-mt-1.5 text-xs text-fg2">{GAMES_COPY}</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <b className="text-sm">Availability</b>
            <Controller
              control={form.control}
              name="present"
              render={({ field }) => (
                <SegmentedControl
                  aria-label="Availability"
                  value={field.value ? 'present' : 'away'}
                  onChange={(value) => field.onChange(value === 'present')}
                  disabled={isPending}
                  options={[
                    { value: 'present', label: 'Present' },
                    { value: 'away', label: 'Not here' },
                  ]}
                />
              )}
            />
          </div>
          {!watched.present && match ? (
            <span className="-mt-1.5 text-xs text-fg2">
              {shownName} is in a match now. Marking them not here doesn't take them off it.
            </span>
          ) : null}
        </Section>
      </form>
    </Sheet>
  )
}
