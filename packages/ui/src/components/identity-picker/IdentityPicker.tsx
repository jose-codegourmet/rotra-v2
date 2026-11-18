'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { ClubLogo } from '@rotra/ui/club-logo'
import { Sheet } from '@rotra/ui/sheet'
import { SnapCarousel } from '@rotra/ui/snap-carousel'

/** What one club saved about the person, as the club typed it. */
export type IdentityPickerRecord = {
  /** The club's saved-player id: what onPick returns */
  id: string
  clubName: string
  clubInitials: string
  clubLogoUrl?: string | null
  name: string
  nickname: string | null
  /** The club's picture of them; initials show when missing */
  picture?: string | null
  /** The level label ("Intermediate Low") */
  levelLabel: string
  /** Already masked ("+63 918 ••• ••77"); the full number never arrives. Null: the club has none. */
  maskedPhone: string | null
  /** "2019" or "3 years"; null: not added */
  playingSince: string | null
  playingStyle: string | null
  links: string[]
  /** The date the club saved them ("Nov 2, 2026") */
  saved: string
  games: number
  sessions: number
}

export type IdentityPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The email every club saved; shown as typed */
  email: string
  /** The RTR ID the person keeps, whichever card they pick */
  rtrId: string
  /** One card per club that saved the email */
  records: IdentityPickerRecord[]
  /** Called with the picked record's id: one tap on a card; a drag never picks */
  onPick: (recordId: string) => void
  /** Cancel (also the sheet's ×) */
  onCancel: () => void
}

const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five']
const CARD_WIDTH = 'min(300px,72vw)'

function plural(n: number, one: string, other: string) {
  return `${n} ${n === 1 ? one : other}`
}

function facts(record: IdentityPickerRecord): [string, string | null][] {
  return [
    ['Level', record.levelLabel],
    ['Picture', record.picture ? 'A photo' : 'Initials'],
    ['Phone', record.maskedPhone],
    ['Playing since', record.playingSince],
    ['Playing style', record.playingStyle],
    ['Links', record.links.length ? record.links.join(', ') : null],
    ['Saved', record.saved],
    [
      'Played here',
      `${plural(record.games, 'game', 'games')} in ${plural(record.sessions, 'session', 'sessions')}`,
    ],
  ]
}

/**
 * “Which identity is correct?” (D-2026-11-16-04, 2026-11-16-player-unclaimed-identity): shown when
 * the email a person registers with was saved by more than one club. One card per club inside the
 * share dialog's carousel (SnapCarousel): the card in view is centred with the next one peeking in,
 * one swipe moves one card. Each card shows the club's logo and name, the club's picture, name and
 * nickname for the person, then everything that club saved; an empty value reads “Not added”.
 * Tapping a card picks it; Cancel leaves.
 */
export function IdentityPicker({
  open,
  onOpenChange,
  email,
  rtrId,
  records,
  onPick,
  onCancel,
}: IdentityPickerProps) {
  const count = COUNT_WORDS[records.length] || String(records.length)
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Which identity is correct?"
      footer={<Button onClick={onCancel}>Cancel</Button>}
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 text-fg2">
          {count} clubs saved a profile with <b className="text-fg">{email}</b>. Pick the one
          that&apos;s right. It becomes your starting profile, and you can change it after.
        </p>
        <SnapCarousel
          label="Identities"
          className="scroll-px-0 items-stretch px-[calc(50%_-_min(300px,72vw)/2)]"
          itemClassName="flex snap-always"
          items={records.map((record) => ({
            id: record.id,
            node: (
              <button
                type="button"
                onClick={() => onPick(record.id)}
                aria-label={`${record.clubName}: ${record.name}${record.nickname ? `, ${record.nickname}` : ''}, ${record.levelLabel}. Use this identity`}
                style={{ width: CARD_WIDTH }}
                className="flex cursor-pointer flex-col items-stretch gap-2.5 rounded-lg border border-border-strong bg-surface p-3.5 text-left font-[inherit] text-fg hover:border-accent hover:bg-elev focus-visible:border-accent focus-visible:bg-elev focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="flex min-w-0 items-center gap-2 font-bold [overflow-wrap:anywhere]">
                  <ClubLogo size="sm" initials={record.clubInitials} logoUrl={record.clubLogoUrl} />
                  <span>{record.clubName}</span>
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar
                    name={record.name}
                    src={record.picture ?? undefined}
                    size={48}
                    tone={record.picture ? 'neutral' : 'accent'}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5 [overflow-wrap:anywhere]">
                    <b>{record.name}</b>
                    <span className="text-[13px] text-fg2">
                      {record.nickname ? `“${record.nickname}”` : 'No nickname'}
                    </span>
                  </span>
                </span>
                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[13px]">
                  {facts(record).map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-fg2">{label}</dt>
                      <dd className="m-0 [overflow-wrap:anywhere]">
                        {value ?? <span className="text-fg2">Not added</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </button>
            ),
          }))}
        />
        <p className="m-0 text-[13px] text-fg2">
          Your player ID stays <span className="font-mono">{rtrId}</span>. Every club&apos;s record
          with this email joins your account with its games, whichever you pick.
        </p>
      </div>
    </Sheet>
  )
}
