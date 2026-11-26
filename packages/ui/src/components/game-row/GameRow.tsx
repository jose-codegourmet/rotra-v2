import type { PlayerGame, PlayerGamePlayer } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'
import { Icon } from '@rotra/ui/icon'
import { MatchCourt, type MatchCourtPlayer, type MatchCourtProps } from '@rotra/ui/match-court'

/** One face on the court; `playerId` null is a guest or someone with no ROTRA profile. */
export type GameRowPlayer = PlayerGamePlayer

export type GameRowProps = {
  game: PlayerGame
  /**
   * The profile the games belong to, drawn first on the left. `label` is “You” on your own profile,
   * else the first name. Missing draws “Player”.
   */
  me?: { name: string; label: string; picture?: string | null; playerId: string | null }
  /** Opens the tapped face's profile card; without it the faces are not buttons */
  onOpenPlayer?: (player: GameRowPlayer) => void
  /** Your own games only: the round share icon in the top-right corner (“Share this game”) */
  onShare?: () => void
  /** Muted line under the court (Recent games: “session · date · club”) */
  dateLine?: string
  /**
   * Opens this game's match page (2026-11-25 match page log): the whole court box is a button
   * under the faces; faces and the share icon keep their own actions. Without it the court opens
   * nothing (the match page's own court).
   */
  onOpen?: () => void
  /**
   * Match page court only: each face's skill-group ring (off by default). Returns the face's skill
   * group that night, or null for the none ring.
   */
  skillRings?: (player: GameRowPlayer) => MatchCourtPlayer['skillGroup']
  /**
   * Match page: the signed-in player, whose face reads “You” wherever they sit (another player's
   * earlier games drawn from that player's side).
   */
  viewerPlayerId?: string | null
  /** The taller court on the Game page. Other game rows use the default size. */
  size?: MatchCourtProps['size']
}

export const MATCH_FORMAT_LABELS = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

const firstName = (name: string) => name.split(/\s+/)[0] ?? name

/** The session matches dialog and the Game page label an unlabelled fun game. */
export function withFunGameNote(game: PlayerGame): PlayerGame {
  return game.counting === 'fun' && !game.note ? { ...game, note: 'Fun game' } : game
}

/** Under every game of a not ranked session (Record games off, D-2026-11-20-02) */
export const NOT_RANKED_NOTE =
  "Not ranked session · doesn't count toward win rate or the leaderboards"

/**
 * A player game as a small badminton court (P-MATCH-HISTORY, 2026-11-13 game row log; the
 * prototype's gameRow): the Player variant of the shared MatchCourt. The player and partner are on
 * the left, opponents on the right; the format is the corner pill and, on your own games, a share
 * icon sits top-right. Faces open the profile card and carry the games badge (how many games that
 * person had played in the session, this one included; 2026-11-14 log). A game of a not ranked
 * session keeps its Won / Lost and carries the not ranked note, without “· not counted”.
 */
export function GameRow({
  game,
  me,
  onOpenPlayer,
  onShare,
  dateLine,
  onOpen,
  skillRings,
  viewerPlayerId,
  size,
}: GameRowProps) {
  const partial = game.counting === 'partial'
  const notRanked = game.counting === 'not_ranked'
  const won = game.result === 'won'
  // Without per-player detail (real mode for now) only your own face opens a card.
  const known = !!game.partnerPlayers && !!game.opponentPlayers
  const partners: GameRowPlayer[] =
    game.partnerPlayers ?? game.partners.map((name) => ({ name, picture: null }))
  const opponents: GameRowPlayer[] =
    game.opponentPlayers ?? game.opponents.map((name) => ({ name, picture: null }))
  const meLabel = me?.label ?? 'Player'
  const labelOf = (p: GameRowPlayer) =>
    viewerPlayerId && p.playerId === viewerPlayerId ? 'You' : firstName(p.name)

  const face = (player: GameRowPlayer, label: string, openable: boolean): MatchCourtPlayer => ({
    key: `${player.playerId ?? ''}-${player.name}`,
    name: player.name,
    label,
    pictureUrl: player.picture,
    onOpen: openable && onOpenPlayer ? () => onOpenPlayer(player) : undefined,
    badge: player.sessionGameNumber,
    skillGroup: skillRings?.(player),
  })

  const left: MatchCourtPlayer[] = [
    ...(me
      ? [
          face(
            {
              name: me.name,
              picture: me.picture ?? null,
              playerId: me.playerId,
              sessionGameNumber: game.sessionGameNumber,
            },
            me.label,
            true,
          ),
        ]
      : []),
    ...partners.map((p) => face(p, labelOf(p), known)),
  ]
  const right = opponents.map((p) => face(p, labelOf(p), known))

  return (
    <MatchCourt
      cornerLabel={MATCH_FORMAT_LABELS[game.format]}
      ariaLabel={`${MATCH_FORMAT_LABELS[game.format]}: ${meLabel}${partners.length ? ` and ${partners.map((p) => p.name).join(' and ')}` : ''} versus ${opponents.map((p) => p.name).join(' and ')}`}
      left={left}
      right={right}
      winner={won ? 'left' : 'right'}
      score={game.score ?? null}
      gameScores={game.gameScores}
      mine
      notCounted={partial}
      note={notRanked ? NOT_RANKED_NOTE : game.note || undefined}
      plainNote={notRanked}
      dateLine={dateLine}
      onOpen={onOpen}
      skillRings={!!skillRings}
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
      size={size}
      className={cn(
        'gap-1.5',
        size === 'match-page' ? 'flex-1' : 'border-t border-border py-3 first:border-t-0',
      )}
    />
  )
}
