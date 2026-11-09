'use client'
import { Button } from '@rotra/ui/button'
import { ShareCard, type ShareCardProps } from '@rotra/ui/share-card'
export type PlayerSessionShareProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  link: string
  name: string
  nickname?: string | null
  picture?: string | null
  title: string
  dateLabel: string
  clubName: string
  wins: number
  losses: number
  onCopy: () => void
}
export type SessionResultShareCardProps = PlayerSessionShareProps & {
  position: number | null
  games: number
}
export function SessionResultShareCard({
  link,
  name,
  nickname,
  picture,
  title,
  dateLabel,
  clubName,
  wins,
  losses,
  position,
  games,
  onCopy,
  ...rest
}: SessionResultShareCardProps) {
  return (
    <ShareCard
      {...rest}
      compactQr
      link={link}
      fileName="rotra-result"
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
      shareTitle="Share result"
      actions="share-or-download"
      leadingAction={<Button onClick={onCopy}>Copy link</Button>}
    >
      <div className="flex flex-1 flex-col justify-center gap-3 text-left">
        <h3 data-qr-text className="text-[22px] font-extrabold text-share-fg">
          {title}
        </h3>
        <p data-qr-text className="text-[13px] text-share-muted">
          {dateLabel} · {clubName}
        </p>
        <div className="flex items-baseline gap-2">
          <b data-qr-text className="font-mono text-[40px] leading-none text-share-accent">
            {position ? `#${position}` : 'No position'}
          </b>
          <span data-qr-text className="text-sm text-share-muted">
            in Standings
          </span>
        </div>
        <b data-qr-text className="text-[15px] text-share-fg">
          {games} {games === 1 ? 'game' : 'games'} · {wins}–{losses}
        </b>
      </div>
    </ShareCard>
  )
}
