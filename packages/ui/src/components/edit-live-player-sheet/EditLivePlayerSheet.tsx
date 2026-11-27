'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { HandicapSpot } from '@rotra/data/session-roster/handicap'
import { NICKNAME_MAX } from '@rotra/schema/personal-details'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { CountStepper } from '@rotra/ui/count-stepper'
import { Field } from '@rotra/ui/field'
import { HandicapPicker } from '@rotra/ui/handicap-picker'
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

export type EditLivePlayerSheetProps = {
  open: boolean
  /**
   * `live` (default): the Players card during the session: Profile, Tonight and Handicap.
   * `preparing` (mockup change 2026-11-27): the Roster and levels card before Start: Profile and
   * Handicap only, no Tonight section and no tonight chip; games and presence are left as they are.
   */
  mode?: 'live' | 'preparing'
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
  /**
   * The club nickname (prefill). Registered players: the club's label for them, with
   * `accountNickname` (the nickname on their ROTRA account) in the hint. Unclaimed and guest
   * players have no account, so this is their one nickname.
   */
  clubNickname?: string | null
  accountNickname?: string | null
  /** The games played the card shows now ("Now N") */
  games: number
  /** Whether they are present now */
  present: boolean
  /** Handicap · tonight (D-2026-11-25-03): the spots marked now; omit for none */
  handicapSpots?: readonly HandicapSpot[]
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

const NO_SPOTS: readonly HandicapSpot[] = []
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
 * differs, chips for level, account kind and tonight's state), a **Profile** section with the Club
 * nickname, a **Tonight** section (Games played with "Now N", Availability Present · Not here) and a
 * **Handicap · tonight** section (D-2026-11-25-03: HandicapPicker). Mockup change 2026-11-27: the
 * Queue Master edits only these four; the full name and picture are not edited here. In the
 * `preparing` mode (Roster and levels pencil) the Tonight section and chip are left out.
 * Cancel / Save changes; no confirmation step.
 */
export function EditLivePlayerSheet({
  open,
  mode = 'live',
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
  handicapSpots = NO_SPOTS,
  onSave,
  onCancel,
  isPending = false,
  error,
}: EditLivePlayerSheetProps) {
  const formId = useId()
  const live = mode === 'live'
  const profileId = useId()
  const nightId = useId()
  const handicapId = useId()
  const gamesLabelId = useId()
  const form = useForm<EditLivePlayerFormInput, unknown, EditLivePlayerFormValues>({
    resolver: zodResolver(editLivePlayerSchema),
    defaultValues: editLivePlayerDefaultValues({
      clubNickname,
      games,
      present,
      spots: handicapSpots,
    }),
  })
  // Start from the player's current values each time the sheet opens.
  useEffect(() => {
    if (open)
      form.reset(
        editLivePlayerDefaultValues({
          clubNickname,
          games,
          present,
          spots: handicapSpots,
        }),
      )
  }, [open, clubNickname, games, present, handicapSpots, form.reset])

  const band = level ? (level.split('_')[0] as 'beginner' | 'intermediate' | 'advanced') : 'none'
  const watched = form.watch()
  const nicknameError = form.formState.errors.nickname?.message
  const tonight = !live ? null : match ? (
    <Chip tone="accent">
      {match.status === 'oncourt' ? 'On court' : 'Playing'} · {match.courtLabel}
    </Chip>
  ) : present ? (
    <Chip>Present</Chip>
  ) : (
    <Chip tone="warn">Not here</Chip>
  )

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
          if (isPending) return
          // Preparing: games and presence are not on the sheet, so they stay as they are.
          onSave(live ? values : { ...values, games, present })
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

        <Section id={profileId} title="Profile">
          <Field
            label="Club nickname (optional)"
            error={nicknameError}
            hint={
              nicknameError
                ? undefined
                : kind === 'registered'
                  ? `What your club calls them. Only your club sees it. Empty uses ${
                      accountNickname
                        ? `“${accountNickname}”, the nickname on their ROTRA account`
                        : 'the name on their ROTRA account'
                    }.`
                  : 'What your club calls them, shown above the full name. They have no ROTRA account yet, so this is their only nickname. Empty shows the full name.'
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
        </Section>

        {live ? (
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
        ) : null}

        <Section id={handicapId} title="Handicap · tonight">
          <Controller
            control={form.control}
            name="spots"
            render={({ field }) => (
              <HandicapPicker
                value={field.value}
                onChange={field.onChange}
                who={shownName}
                disabled={isPending}
              />
            )}
          />
        </Section>
      </form>
    </Sheet>
  )
}
