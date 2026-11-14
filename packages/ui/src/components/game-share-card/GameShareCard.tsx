'use client'
import type { PlayerShareGame, PlayerShareParticipant } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { cn } from '@rotra/ui/cn'
import type { PlayerSessionShareProps } from '@rotra/ui/session-result-share-card'
import { SHARE_FORMATS, type ShareFormat, shareInitials } from '@rotra/ui/share-card/helpers'
import { ShareImage } from '@rotra/ui/share-image'
import { ShareImagePicker } from '@rotra/ui/share-image-picker'

export type GameShareCardProps = Omit<PlayerSessionShareProps, 'wins' | 'losses'> & {
  game: PlayerShareGame
}

const FORMATS = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}

/**
 * Share game (2026-11-13 game row log, pass 5; share cards fill log): one of your own games as the
 * hero of the Story, Facebook post and Square images: session title, date · club, both sides with
 * big faces and first names, the score and Won / Lost, then “FORMAT · Won SCORE”. Available before
 * the club publishes (D-2026-11-13-06). Then OR and the Link.
 */
export function GameShareCard({
  link,
  name,
  nickname,
  picture,
  title,
  dateLabel,
  clubName,
  game,
  onCopy,
  webShare,
  onShared,
  onDownloaded,
  onError,
}: GameShareCardProps) {
  const won = game.result === 'won'
  const mine: PlayerShareParticipant[] = [
    { name, picture: picture ?? null },
    ...(game.partnerPlayers ?? game.partners.map((n) => ({ name: n, picture: null }))),
  ]
  const theirs: PlayerShareParticipant[] =
    game.opponentPlayers ?? game.opponents.map((n) => ({ name: n, picture: null }))
  const images: Record<string, string | null> = { spot: picture ?? null }
  for (const [side, people] of [
    ['mine', mine],
    ['theirs', theirs],
  ] as const)
    people.slice(0, 2).forEach((p, slot) => {
      images[`game-${side}-${slot}`] = p.picture
    })
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

  const team = (
    people: PlayerShareParticipant[],
    side: 'mine' | 'theirs',
    winning: boolean,
    format: ShareFormat,
  ) => (
    <div className={cn('flex min-w-0 flex-col gap-[3px]', side === 'theirs' && 'items-end')}>
      <div className={cn('flex items-center', format === 'story' ? '-space-x-1.5' : '-space-x-2')}>
        {people.slice(0, 2).map((p, slot) => (
          <span
            key={`${slot}-${p.name}`}
            data-qr-logo={`game-${side}-${slot}`}
            data-share-initials={shareInitials(p.name)}
            data-share-winner={winning ? '' : undefined}
            className={cn(
              'block shrink-0 overflow-hidden rounded-full bg-share-fg/10 text-share-fg ring-2',
              format === 'story' ? 'size-[34px]' : 'size-11',
              winning ? 'ring-share-accent' : 'ring-share-bg',
            )}
          >
            <Avatar
              name={p.name}
              src={p.picture ?? undefined}
              size={44}
              className={cn(
                'size-full bg-share-fg/10 text-share-fg',
                format === 'story' ? 'text-[11px]' : 'text-[13px]',
              )}
            />
          </span>
        ))}
        {people.length > 2 ? (
          <span data-qr-text className="pl-3 text-[9px] text-share-muted">
            +{people.length - 2}
          </span>
        ) : null}
      </div>
      <span
        data-qr-text
        title={people.map((p) => p.name).join(', ')}
        className="max-w-full truncate text-xs leading-[15px] text-share-fg"
      >
        {people.map((p) => p.name.split(/\s+/)[0]).join(' + ')}
      </span>
    </div>
  )

  const content = (format: ShareFormat) => (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 text-left">
      <div>
        <h3
          data-qr-text
          title={title}
          className={cn(
            'truncate leading-[1.15] font-extrabold text-share-fg',
            format === 'square' ? 'text-lg' : 'text-[22px]',
          )}
        >
          {title}
        </h3>
        <p
          data-qr-text
          className={cn(
            'truncate text-share-muted',
            format === 'square' ? 'text-[13px]' : 'text-sm',
          )}
        >
          {dateLabel} · {clubName}
        </p>
      </div>
      <article
        aria-label={`${won ? 'Won' : 'Lost'}, ${game.score ?? 'Winner recorded'}`}
        className={cn(
          'grid min-h-24 items-center gap-1 border-y border-share-fg/10 py-2.5',
          format === 'story'
            ? 'grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)]',
        )}
      >
        {team(mine, 'mine', won, format)}
        <div className="flex flex-col items-center gap-px">
          <b
            data-qr-text
            className={cn(
              'font-mono leading-[1.1] font-extrabold',
              format === 'story' ? 'text-2xl' : 'text-[30px]',
              won ? 'text-share-accent' : 'text-share-fg',
            )}
          >
            {game.score ?? '—'}
          </b>
          <span data-qr-text className="text-[11px] text-share-muted">
            {game.score ? (won ? 'Won' : 'Lost') : 'Winner recorded'}
          </span>
        </div>
        {team(theirs, 'theirs', !won, format)}
      </article>
      <b
        data-qr-text
        className={cn('text-share-fg', format === 'square' ? 'text-base' : 'text-lg')}
      >
        {FORMATS[game.format]} · {won ? 'Won' : 'Lost'}
        {game.score ? ` ${game.score}` : ''}
      </b>
    </div>
  )

  return (
    <ShareImagePicker
      shareTitle="Share game"
      pickHint="Tap an image to pick it."
      images={images}
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
        fileName: `rotra-game-${format}`,
        image: (
          <ShareImage
            format={format}
            headline={name}
            subline={nickname ? `“${nickname}”` : 'ROTRA player'}
            spot={{ initials, imageUrl: picture }}
          >
            {content(format)}
          </ShareImage>
        ),
      }))}
    />
  )
}
