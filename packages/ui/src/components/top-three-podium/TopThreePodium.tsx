import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import { useId } from 'react'
import { PixelFire } from './pixel-fire/PixelFire'
import './TopThreePodium.css'

export type PodiumPosition = 1 | 2 | 3

export type PodiumPlayer = {
  id: string
  /** Full name: leaderboards never mask it (D-2026-11-25-04) */
  name: string
  nickname?: string | null
  /** Picture URL; initials from the name show only when there is no picture */
  pictureUrl?: string | null
  /** Use these initials instead of deriving them from the name */
  initials?: string
  /** The record line under the name: "7 wins" or "3 W · 1 L". A shared place adds " each". */
  stat?: string
  /** The record line read out, when it differs from `stat` ("3 wins, 1 loss") */
  statSpoken?: string
  /** The viewer: adds " · You" after the name */
  isMe?: boolean
  /** false: this player's place is not a button even with onOpenPlayer (a profile the viewer may not open) */
  canOpen?: boolean
}

export type PodiumPlace = {
  position: PodiumPosition
  /** Everyone in this place, in the list's order; empty or missing = "No one yet" */
  players: readonly PodiumPlayer[]
}

export type TopThreePodiumProps = {
  /** Places 1 to 3. A missing or empty place keeps its step. */
  places: readonly PodiumPlace[]
  /** The muted line beside "Top three": "Top weekly · Nov 23 to Nov 29 · top 50", "This session · 8 players" */
  caption: string
  /** A one-player place opens that player. Omit for a podium that opens nothing. */
  onOpenPlayer?: (id: string) => void
  /** A shared place opens the dialog of everyone in it. Omit for a podium that opens nothing. */
  onOpenPlace?: (position: PodiumPosition) => void
}

const POSITIONS = [1, 2, 3] as const
const PLACE_WORD = { 1: 'First', 2: 'Second', 3: 'Third' } as const
const PLACE_SHORT = { 1: '1st', 2: '2nd', 3: '3rd' } as const

/** "A", "A and B", "A, B and C" */
function listNames(names: readonly string[]) {
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The prototypes' leaderboard podium (rotra-player.html `podium()`, rotra-queue.html `podiumHtml`).
 * Always three steps; DOM order stays 1–2–3 while CSS places second on the left. A place holds one
 * player, several players stacked (two or three pictures, or two and "+N"), or no one yet.
 */
export function TopThreePodium({
  places,
  caption,
  onOpenPlayer,
  onOpenPlace,
}: TopThreePodiumProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="rotra-podium">
      <span className="rotra-embers" aria-hidden>
        {Array.from({ length: 14 }, (_, index) => (
          <i
            key={index}
            style={{
              left: `${4 + ((index * 37) % 92)}%`,
              animationDelay: `${((index * 0.73) % 5).toFixed(2)}s`,
              animationDuration: `${4 + (index % 4)}s`,
            }}
          />
        ))}
      </span>
      <div className="rotra-pod-head">
        <h2 id={titleId}>Top three</h2>
        <span className="text-[13px] text-fg2">{caption}</span>
      </div>
      <div className="rotra-pod-stage">
        {POSITIONS.map((position) => (
          <PodiumStep
            key={position}
            position={position}
            players={places.find((place) => place.position === position)?.players ?? []}
            onOpenPlayer={onOpenPlayer}
            onOpenPlace={onOpenPlace}
          />
        ))}
      </div>
    </section>
  )
}

function PodiumStep({
  position,
  players,
  onOpenPlayer,
  onOpenPlace,
}: {
  position: PodiumPosition
  players: readonly PodiumPlayer[]
  onOpenPlayer?: (id: string) => void
  onOpenPlace?: (position: PodiumPosition) => void
}) {
  const word = PLACE_WORD[position]
  const step = (
    <span className="rotra-pod-step" aria-hidden>
      <b>{position}</b>
      <small>{PLACE_SHORT[position]}</small>
    </span>
  )
  const first = players[0]
  if (!first) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: a podium step is a named group, not a fieldset
      <div
        role="group"
        aria-label={`${word} place: no one yet`}
        className={cn('rotra-pod empty', `p${position}`)}
      >
        <span className="rotra-pod-who">
          <span aria-hidden className="avatar rotra-pod-none" />
          <b className="rotra-pod-name">No one yet</b>
        </span>
        {step}
      </div>
    )
  }

  const fire = position === 1 ? <PixelFire /> : null
  const spoken = first.statSpoken ?? first.stat

  if (players.length === 1) {
    const open = onOpenPlayer && first.canOpen !== false ? () => onOpenPlayer(first.id) : undefined
    const label = `${word} place, ${first.name}${first.isMe ? ' (you)' : ''}${spoken ? `, ${spoken}` : ''}`
    const who = (
      <span className="rotra-pod-who">
        {fire}
        <Avatar
          name={first.name}
          src={first.pictureUrl ?? undefined}
          initials={first.initials}
          size={position === 1 ? 88 : 64}
          className="avatar"
        />
        <b className="rotra-pod-name">{first.name}</b>
        {first.nickname ? (
          <span className="relative z-10 text-[13px] text-fg2">“{first.nickname}”</span>
        ) : null}
        {first.stat ? <span className="rotra-pod-lv">{first.stat}</span> : null}
      </span>
    )
    const className = cn('rotra-pod', `p${position}`, first.isMe && 'me')
    return open ? (
      <button type="button" onClick={open} aria-label={label} className={className}>
        {who}
        {step}
      </button>
    ) : (
      // biome-ignore lint/a11y/useSemanticElements: a podium step is a named group, not a fieldset
      <div role="group" aria-label={label} className={className}>
        {who}
        {step}
      </div>
    )
  }

  // Past three, two pictures and a "+N" bubble keep the stack inside its step on a 375 px phone.
  const faces = players.length > 3 ? players.slice(0, 2) : players
  const more = players.length - faces.length
  const names = players.map((player) => player.name)
  const open = onOpenPlace ? () => onOpenPlace(position) : undefined
  const label = `${word} place, shared by ${players.length} players: ${listNames(names)}${spoken ? `, ${spoken} each` : ''}${open ? ". See who's in this place" : ''}`
  const who = (
    <span className="rotra-pod-who">
      {fire}
      <span className="rotra-pod-stack">
        {faces.map((player) => (
          <Avatar
            key={player.id}
            name={player.name}
            src={player.pictureUrl ?? undefined}
            initials={player.initials}
            size={52}
            className="avatar"
          />
        ))}
        {more ? (
          <span aria-hidden className="avatar rotra-pod-more">
            +{more}
          </span>
        ) : null}
      </span>
      {players.slice(0, 2).map((player) => (
        <b key={player.id} className="rotra-pod-name">
          {player.name}
          {player.isMe ? ' · You' : ''}
        </b>
      ))}
      {players.length > 2 ? (
        <span className="relative z-10 text-[13px] text-fg2">+{players.length - 2} more</span>
      ) : null}
      {first.stat ? <span className="rotra-pod-lv">{first.stat} each</span> : null}
    </span>
  )
  const className = cn('rotra-pod stacked', `p${position}`)
  return open ? (
    <button type="button" onClick={open} aria-label={label} className={className}>
      {who}
      {step}
    </button>
  ) : (
    // biome-ignore lint/a11y/useSemanticElements: a podium step is a named group, not a fieldset
    <div role="group" aria-label={label} className={className}>
      {who}
      {step}
    </div>
  )
}
