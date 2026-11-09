'use client'
import type { PlayerShareGame, PlayerShareParticipant } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { cn } from '@rotra/ui/cn'
import type { PlayerSessionShareProps } from '@rotra/ui/session-result-share-card'
import { ShareCard } from '@rotra/ui/share-card'
export type SessionGamesShareCardProps = PlayerSessionShareProps & { games: PlayerShareGame[] }
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
  ...rest
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
  const teamView = (players: PlayerShareParticipant[], index: number, side: 'mine' | 'theirs') => (
    <div className={cn('flex min-w-0 flex-col gap-0.5', side === 'theirs' && 'items-end')}>
      <div className="flex items-center -space-x-1">
        {players.slice(0, 2).map((player, slot) => (
          <span
            key={`${slot}-${player.name}`}
            data-qr-logo={`game-${index}-${side}-${slot}`}
            className="block size-6 shrink-0 overflow-hidden rounded-full bg-share-fg/10 ring-2 ring-share-bg"
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
          <span data-qr-text className="pl-2 text-[9px] text-share-muted">
            +{players.length - 2}
          </span>
        ) : null}
      </div>
      <span
        data-qr-text
        title={players.map((p) => p.name).join(', ')}
        className="max-w-full truncate text-[9px] leading-[11px] text-share-muted"
      >
        {players
          .map((p, slot) => (side === 'mine' && slot === 0 ? 'You' : p.name.split(/\s+/)[0]))
          .join(' + ')}
      </span>
    </div>
  )
  return (
    <ShareCard
      {...rest}
      compactQr
      link={link}
      fileName="rotra-games"
      headline={name}
      subline={nickname ? `“${nickname}”` : undefined}
      spot={{
        initials: name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join(''),
        imageUrl: picture,
      }}
      title={title}
      infoLines={[]}
      qrCaption=""
      qrLabel="QR code that opens your profile"
      shareTitle="Share games"
      actions="share-or-download"
      additionalImages={images}
      leadingAction={<Button onClick={onCopy}>Copy link</Button>}
    >
      {(format) => {
        const limit = format === 'story' ? 4 : 3
        return (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 text-left">
            <div>
              <h3
                data-qr-text
                title={title}
                className="truncate text-lg font-extrabold text-share-fg"
              >
                {title}
              </h3>
              <p data-qr-text className="truncate text-[11px] leading-[15px] text-share-muted">
                {dateLabel} · {clubName}
              </p>
            </div>
            <div>
              {games.slice(0, limit).map((game, index) => (
                <article
                  key={game.id}
                  className="relative grid min-h-11 grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-center gap-1 py-1"
                  aria-label={`Game ${index + 1}, ${game.result === 'won' ? 'Won' : 'Lost'}, ${game.score ?? 'Winner recorded'}`}
                >
                  {teamView(teams[index]?.mine ?? [], index, 'mine')}
                  <div className="flex flex-col items-center gap-0.5">
                    <b
                      data-qr-text
                      className={cn(
                        'font-mono text-xl leading-[22px] font-extrabold',
                        game.result === 'won' ? 'text-share-accent' : 'text-share-fg',
                      )}
                    >
                      {game.score ?? '—'}
                    </b>
                    <span data-qr-text className="text-[9px] leading-[11px] text-share-muted">
                      {game.score ? (game.result === 'won' ? 'Won' : 'Lost') : 'Winner recorded'}
                    </span>
                  </div>
                  {teamView(teams[index]?.theirs ?? [], index, 'theirs')}
                  <i
                    data-share-cell="divider"
                    className="absolute inset-x-0 bottom-0 h-px bg-share-fg/10"
                  />
                </article>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <b data-qr-text className="text-[13px] text-share-fg">
                Total W–L {wins}–{losses}
              </b>
              {games.length > limit ? (
                <span data-qr-text className="text-[10px] text-share-muted">
                  +{games.length - limit} more games
                </span>
              ) : null}
            </div>
          </div>
        )
      }}
    </ShareCard>
  )
}
