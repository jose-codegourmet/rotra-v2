import type { PlayerGame, PlayerGamePlayer } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Chip } from '@rotra/ui/chip'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'

/** One face on the court; `playerId` null is a guest or someone with no ROTRA profile. */
export type GameRowPlayer = PlayerGamePlayer

export type GameRowProps = {
  game: PlayerGame
  /**
   * The profile the games belong to, drawn first on the left. `label` is “You” on your own profile,
   * else the first name. Missing draws “Player”.
   */
  me?: { name: string; label: string; picture?: string | null; playerId: string }
  /** Opens the tapped face's profile card; without it the faces are not buttons */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** Your own games only: the round share icon in the top-right corner (“Share this game”) */
  onShare?: () => void
  /** Muted line under the court (Recent games: “session · date · club”) */
  dateLine?: string
}

const FORMATS = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

const firstName = (name: string) => name.split(/\s+/)[0] ?? name

/** The Queue app's court art (viewBox 134 × 61): solid court green, white lines, the dashed net. */
function CourtArt() {
  return (
    <svg
      viewBox="0 0 134 61"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 block size-full"
    >
      <rect width={134} height={61} fill="var(--color-court)" />
      <g
        fill="none"
        stroke="var(--color-court-line)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      >
        <rect x={0.75} y={0.75} width={132.5} height={59.5} vectorEffect="non-scaling-stroke" />
        <path
          d="M0 4.6H134M0 56.4H134M7.6 0V61M126.4 0V61M47.2 0V61M86.8 0V61M0 30.5H47.2M86.8 30.5H134"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <path
        d="M67 0V61"
        stroke="var(--color-court-line)"
        strokeWidth={3}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * A player game as a small badminton court (P-MATCH-HISTORY, 2026-11-13 game row log; the
 * prototype's gameRow): the player and partner on the left, opponents on the right, each a face
 * with the first name, the winning side ringed in the accent. The score and the Won / Lost (Not
 * counted) chip sit in a dark box on the net; the format is a pill top-left and, on your own games,
 * a share icon top-right. Faces open the profile card.
 */
export function GameRow({ game, me, onOpenPlayer, onShare, dateLine }: GameRowProps) {
  const partial = game.counting === 'partial'
  const won = game.result === 'won'
  // Without per-player detail (real mode for now) only your own face opens a card.
  const known = !!game.partnerPlayers && !!game.opponentPlayers
  const partners: GameRowPlayer[] =
    game.partnerPlayers ?? game.partners.map((name) => ({ name, picture: null }))
  const opponents: GameRowPlayer[] =
    game.opponentPlayers ?? game.opponents.map((name) => ({ name, picture: null }))
  const meLabel = me?.label ?? 'Player'

  const face = (player: GameRowPlayer, label: string, lit: boolean, openable: boolean) => {
    const body = (
      <>
        <Avatar
          name={player.name}
          src={player.picture ?? undefined}
          size={44}
          className={cn(
            'size-[46px] text-sm max-[480px]:size-9 max-[480px]:text-xs',
            lit ? 'ring-3 ring-accent' : 'ring-2 ring-court-line',
            openable &&
              'group-hover/face:ring-3 group-hover/face:ring-accent group-focus-visible/face:ring-3 group-focus-visible/face:ring-accent',
          )}
        />
        <b className="max-w-full truncate rounded-full bg-court-level-label px-[7px] text-xs leading-[1.3] font-bold text-on-photo">
          {label}
        </b>
      </>
    )
    const className =
      'group/face flex min-w-0 max-w-[84px] flex-col items-center gap-[3px] rounded-lg border-0 bg-transparent p-0.5 text-on-photo max-[480px]:max-w-14'
    return openable && onOpenPlayer ? (
      <button
        key={`${player.playerId ?? ''}-${player.name}`}
        type="button"
        aria-label={`${player.name}. View profile`}
        onClick={() => onOpenPlayer(player)}
        className={cn(className, 'cursor-pointer focus-visible:outline-none')}
      >
        {body}
      </button>
    ) : (
      <span key={`${player.playerId ?? ''}-${player.name}`} className={className}>
        {body}
      </span>
    )
  }

  const side = 'relative z-1 flex min-w-0 items-center justify-evenly gap-1.5 px-1 py-3'
  return (
    <div className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0">
      <div
        role="group"
        aria-label={`${FORMATS[game.format]}: ${meLabel}${partners.length ? ` and ${partners.map((p) => p.name).join(' and ')}` : ''} versus ${opponents.map((p) => p.name).join(' and ')}`}
        className="relative grid min-h-[132px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center overflow-hidden rounded-lg pt-2.5 max-[480px]:min-h-[100px]"
      >
        <CourtArt />
        <div className={side}>
          {me
            ? face(
                { name: me.name, picture: me.picture ?? null, playerId: me.playerId },
                me.label,
                won && !partial,
                true,
              )
            : null}
          {partners.map((p) => face(p, firstName(p.name), won && !partial, known))}
        </div>
        <span className="absolute top-2 left-2 z-2 rounded-full bg-court-level-label px-2 text-[10px] font-extrabold tracking-[0.5px] text-on-photo/85 uppercase">
          {FORMATS[game.format]}
        </span>
        {onShare && !partial ? (
          <button
            type="button"
            onClick={onShare}
            aria-label="Share this game"
            title="Share this game"
            className="absolute top-1.5 right-1.5 z-2 grid size-[30px] cursor-pointer place-items-center rounded-full border-0 bg-court-level-label p-0 text-on-photo hover:ring-2 hover:ring-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon name="share" size={14} />
          </button>
        ) : null}
        <div className="relative z-1 mx-1 flex min-w-24 flex-col items-center justify-center gap-1.5 rounded-xl bg-court-level-label px-3.5 py-2.5 text-center text-on-photo max-[480px]:mx-0.5 max-[480px]:min-w-0 max-[480px]:px-2 max-[480px]:py-2">
          {game.score ? (
            <span
              aria-label={`Score ${game.score}`}
              className="font-mono text-[22px] leading-none font-bold whitespace-nowrap tabular-nums max-[480px]:text-[17px]"
            >
              {game.score}
            </span>
          ) : (
            <span
              title="Winner recorded; score not entered"
              className="text-[13px] font-semibold whitespace-nowrap text-on-photo/80 max-[480px]:text-[11px]"
            >
              No score
            </span>
          )}
          {partial ? (
            <Chip>Not counted</Chip>
          ) : (
            <Chip tone={won ? 'accent' : 'error'}>{won ? 'Won' : 'Lost'}</Chip>
          )}
        </div>
        <div className={side}>
          {opponents.map((p) => face(p, firstName(p.name), !won && !partial, known))}
        </div>
      </div>
      {game.note ? <div className="text-[13px] text-warn">{game.note} · not counted</div> : null}
      {dateLine ? <p className="text-[13px] text-fg2">{dateLine}</p> : null}
    </div>
  )
}
