'use client'
import type { PlayerShareGame, PlayerShareParticipant } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import type { PlayerSessionShareProps } from '@rotra/ui/session-result-share-card'
import { SHARE_FORMATS, type ShareFormat, shareInitials } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker } from '@rotra/ui/share-image-picker'
export type SessionGamesShareCardProps = PlayerSessionShareProps & { games: PlayerShareGame[] }
/** Game rows per size (the prototype's SHARE_GAME_LIMIT). */
const GAME_LIMIT: Record<ShareFormat, number> = { post: 3, story: 4, square: 2 }
/**
 * Share games: the Story, Facebook post and Square images of one published session's games (no QR),
 * then OR and the Link. `initialFormat` is kept and ignored.
 */
export function SessionGamesShareCard({
  link,
  name,
  nickname,
  picture,
  title,
  dateLabel,
  clubName,
  wins,
  losses,
  games,
  onCopy,
  webShare,
  onShared,
  onDownloaded,
  onError,
}: SessionGamesShareCardProps) {
  const teams = games.map((game) => ({
    mine: [
      { name, picture: picture ?? null },
      ...(game.partnerPlayers ?? game.partners.map((name) => ({ name, picture: null }))),
    ],
    theirs: game.opponentPlayers ?? game.opponents.map((name) => ({ name, picture: null })),
  }))
  const images: Record<string, string | null> = {}
  teams.forEach((team, index) => {
    for (const side of ['mine', 'theirs'] as const)
      team[side].slice(0, 2).forEach((player, slot) => {
        images[`game-${index}-${side}-${slot}`] = player.picture
      })
  })
  const teamView = (
    players: PlayerShareParticipant[],
    index: number,
    side: 'mine' | 'theirs',
    winning: boolean,
  ) => (
    <div className={cn('flex min-w-0 flex-col gap-[3px]', side === 'theirs' && 'items-end')}>
      <div className="flex items-center -space-x-1">
        {players.slice(0, 2).map((player, slot) => (
          <span
            key={`${slot}-${player.name}`}
            data-qr-logo={`game-${index}-${side}-${slot}`}
            data-share-initials={shareInitials(player.name)}
            data-share-winner={winning ? '' : undefined}
            className={cn(
              'block size-6 shrink-0 overflow-hidden rounded-full bg-share-fg/10 text-share-fg ring-2',
              winning ? 'ring-share-accent' : 'ring-share-bg',
            )}
          >
            <Avatar
              name={player.name}
              src={player.picture ?? undefined}
              size={24}
              className="size-full bg-share-fg/10 text-[8px] text-share-fg"
            />
          </span>
        ))}
        {players.length > 2 ? (
          <span data-qr-text className="pl-1.5 text-[9px] text-share-muted">
            +{players.length - 2}
          </span>
        ) : null}
      </div>
      <span
        data-qr-text
        title={players.map((p) => p.name).join(', ')}
        className="max-w-full truncate text-[9px] leading-[11px] text-share-muted"
      >
        {players.map((p) => p.name.split(/\s+/)[0]).join(' + ')}
      </span>
    </div>
  )
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  const content = (format: ShareFormat) => {
    const limit = GAME_LIMIT[format]
    return (
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col text-left',
          format === 'square' ? 'justify-start gap-2' : 'justify-center',
          format === 'post' && 'gap-3',
          format === 'story' && 'gap-2',
        )}
      >
        <h3
          data-qr-text
          title={title}
          className="truncate text-lg leading-[1.15] font-extrabold text-share-fg"
        >
          {title}
        </h3>
        <p
          data-qr-text
          className={cn(
            'truncate leading-[1.4] text-share-muted',
            format === 'square' ? 'text-[13px]' : 'text-sm',
          )}
        >
          {dateLabel} · {clubName}
        </p>
        <div>
          {games.slice(0, limit).map((game, index) => (
            <article
              key={game.id}
              className="relative grid min-h-11 grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-center gap-1 py-1"
              aria-label={`Game ${index + 1}, ${game.result === 'won' ? 'Won' : 'Lost'}, ${game.score ?? 'Winner recorded'}`}
            >
              {teamView(teams[index]?.mine ?? [], index, 'mine', game.result === 'won')}
              <div className="flex flex-col items-center gap-px">
                <b
                  data-qr-text
                  className={cn(
                    'font-mono text-xl leading-[1.1] font-extrabold',
                    game.result === 'won' ? 'text-share-accent' : 'text-share-fg',
                  )}
                >
                  {game.score ?? '—'}
                </b>
                <span data-qr-text className="text-[9px] leading-[11px] text-share-muted">
                  {game.score ? (game.result === 'won' ? 'Won' : 'Lost') : 'Winner recorded'}
                </span>
              </div>
              {teamView(teams[index]?.theirs ?? [], index, 'theirs', game.result === 'lost')}
              <i
                data-share-cell="divider"
                className="absolute inset-x-0 bottom-0 h-px bg-share-fg/10"
              />
            </article>
          ))}
        </div>
        {games.length > limit ? (
          <span data-qr-text className="text-[11px] text-share-muted">
            +{games.length - limit} more games
          </span>
        ) : null}
        <b
          data-qr-text
          className={cn('text-share-fg', format === 'square' ? 'text-[15px]' : 'text-[18px]')}
        >
          Total W–L {wins}–{losses}
        </b>
      </div>
    )
  }
  return (
    <ShareImagePicker
      shareTitle="Share games"
      pickHint="Tap an image to pick it."
      images={{ spot: picture, ...images }}
      link={link}
      linkLabel="Link"
      copyLabel="Copy link"
      onCopy={onCopy}
      webShare={webShare}
      onShared={onShared}
      onError={onError}
      onDownloaded={(item) => onDownloaded?.(item.format)}
      items={SHARE_FORMATS.map(({ format, label, hint }) => ({
        id: format,
        label,
        hint,
        format,
        fileName: `rotra-games-${format}`,
        image: (
          <ShareImage
            format={format}
            headline={name}
            subline={nickname ? `“${nickname}”` : undefined}
            spot={{ initials, imageUrl: picture }}
          >
            {content(format)}
          </ShareImage>
        ),
      }))}
    />
  )
}
