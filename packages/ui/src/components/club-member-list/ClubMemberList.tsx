'use client'

import { AlphabetIndex } from '@rotra/ui/alphabet-index'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { Field } from '@rotra/ui/field'
import { LetterGroup, letterHeadingId } from '@rotra/ui/letter-group'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { TextInput } from '@rotra/ui/text-input'

export type ClubMemberBand = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'none'

export type ClubMemberListRow = {
  /** Stable row key (a masked member carries no player id) */
  key: string
  /** Full name, or the masked name for a masked member */
  name: string
  picture?: string | null
  /** "Intermediate Low", or "No level yet" */
  levelLabel: string
  isYou: boolean
  /** False for a masked member: listed without a button */
  openable: boolean
}

export type ClubMemberListProps = {
  /** The rows that match the search and level, sorted by the name shown */
  rows: ClubMemberListRow[]
  /** Every listed member of the club */
  totalCount: number
  query: string
  band: ClubMemberBand
  onQueryChange: (query: string) => void
  onBandChange: (band: ClubMemberBand) => void
  onClear: () => void
  onOpen: (key: string) => void
}

const BANDS: { value: ClubMemberBand; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'none', label: 'No level yet' },
]
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']
const num = (n: number) => n.toLocaleString('en-US')
const letterOf = (name: string) => {
  const c = name.trim().charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}

function jump(letter: string) {
  const heading = document.getElementById(letterHeadingId(letter))
  if (!heading) return
  heading.closest('section')?.scrollIntoView({ block: 'start' })
  heading.focus()
}

/**
 * P-CLUB-MEMBERS: every registered member of a club, like Queue › Saved players: Search, a Level
 * segment, "Showing N of M" with Clear, one card per first letter and an A–Z index.
 */
export function ClubMemberList({
  rows,
  totalCount,
  query,
  band,
  onQueryChange,
  onBandChange,
  onClear,
  onOpen,
}: ClubMemberListProps) {
  const filtered = query.trim() !== '' || band !== 'all'
  const groups = new Map<string, ClubMemberListRow[]>()
  for (const row of rows) {
    const letter = letterOf(row.name)
    groups.set(letter, [...(groups.get(letter) ?? []), row])
  }
  const letters = LETTERS.filter((letter) => groups.has(letter))
  return (
    <>
      <Card asChild>
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-[minmax(0,1fr)_auto] min-[720px]:items-end">
            <Field label="Search">
              <TextInput
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Name or nickname"
                autoComplete="off"
              />
            </Field>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-fg2">Level</span>
              <SegmentedControl
                aria-label="Level"
                options={BANDS}
                value={band}
                onChange={(next) => onBandChange(next as ClubMemberBand)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-fg2" aria-live="polite">
              Showing {num(rows.length)} of {num(totalCount)}
            </span>
            {filtered ? (
              <Button size="xs" variant="ghost" onClick={onClear}>
                Clear
              </Button>
            ) : null}
          </div>
        </section>
      </Card>
      {rows.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 flex-col gap-[18px]">
            {letters.map((letter) => {
              const list = groups.get(letter) ?? []
              return (
                <LetterGroup key={letter} letter={letter} count={list.length} layout="list">
                  {list.map((row) => {
                    const inner = (
                      <>
                        <Avatar name={row.name} src={row.picture ?? undefined} size={52} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <b className="truncate">{row.name}</b>
                            {row.isYou ? <Chip tone="accent">You</Chip> : null}
                          </span>
                          <span className="text-sm text-fg2">{row.levelLabel}</span>
                        </span>
                      </>
                    )
                    const rowClass =
                      'flex w-full min-w-0 items-center gap-3 border-0 bg-transparent py-2.5 text-left text-inherit [&+&]:border-t [&+&]:border-border'
                    return row.openable ? (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => onOpen(row.key)}
                        aria-label={`${row.name}, ${row.levelLabel}`}
                        className={`cursor-pointer hover:bg-elev focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${rowClass}`}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div key={row.key} className={rowClass}>
                        {inner}
                      </div>
                    )
                  })}
                </LetterGroup>
              )
            })}
          </div>
          <AlphabetIndex available={letters} onJump={jump} />
        </div>
      ) : (
        <Card className="flex flex-wrap items-center justify-center gap-2 px-3 py-6 text-center text-sm text-fg2">
          No members match.
          {filtered ? (
            <Button size="xs" onClick={onClear}>
              Clear
            </Button>
          ) : null}
        </Card>
      )}
    </>
  )
}
