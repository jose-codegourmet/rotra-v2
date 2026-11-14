import type { PlayerGame, PlayerGamePlayer } from '@rotra/data/player/types'
import { Icon } from '@rotra/ui/icon'
import { MatchCourt, type MatchCourtPlayer } from '@rotra/ui/match-court'

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

/**
 * A player game as a small badminton court (P-MATCH-HISTORY, 2026-11-13 game row log; the
 * prototype's gameRow): the Player variant of the shared MatchCourt. The player and partner are on
 * the left, opponents on the right; the format is the corner pill and, on your own games, a share
 * icon sits top-right. Faces open the profile card.
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

  const face = (player: GameRowPlayer, label: string, openable: boolean): MatchCourtPlayer => ({
    key: `${player.playerId ?? ''}-${player.name}`,
    name: player.name,
    label,
    pictureUrl: player.picture,
    onOpen: openable && onOpenPlayer ? () => onOpenPlayer(player) : undefined,
  })

  const left: MatchCourtPlayer[] = [
    ...(me
      ? [
          face(
            { name: me.name, picture: me.picture ?? null, playerId: me.playerId },
            me.label,
            true,
          ),
        ]
      : []),
    ...partners.map((p) => face(p, firstName(p.name), known)),
  ]
  const right = opponents.map((p) => face(p, firstName(p.name), known))

  return (
    <MatchCourt
      cornerLabel={FORMATS[game.format]}
      ariaLabel={`${FORMATS[game.format]}: ${meLabel}${partners.length ? ` and ${partners.map((p) => p.name).join(' and ')}` : ''} versus ${opponents.map((p) => p.name).join(' and ')}`}
      left={left}
      right={right}
      winner={won ? 'left' : 'right'}
      score={game.score ?? null}
      mine
      notCounted={partial}
      note={game.note ?? undefined}
      dateLine={dateLine}
      action={
        onShare && !partial ? (
          <button
            type="button"
            onClick={onShare}
            aria-label="Share this game"
            title="Share this game"
            className="absolute top-1.5 right-1.5 z-2 grid size-[30px] cursor-pointer place-items-center rounded-full border-0 bg-court-level-label p-0 text-on-photo hover:ring-2 hover:ring-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon name="share" size={14} />
          </button>
        ) : undefined
      }
      className="gap-1.5 border-t border-border py-3 first:border-t-0"
    />
  )
}
