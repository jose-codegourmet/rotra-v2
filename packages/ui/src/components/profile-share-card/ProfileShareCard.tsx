'use client'
import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
import { ShareCard, type ShareCardProps } from '@rotra/ui/share-card'

export type ProfileShareCardProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  link: string
  name: string
  nickname?: string | null
  /** Photo, resolved character or null for initials. */
  picture?: string | null
  /** Null shows "Not ranked yet". */
  levelLabel: string | null
  /** The overall leaderboard position; hidden when there is none. */
  position: number | null
  /** Counted wins in the last 90 days; null shows "No games yet". */
  wins: number | null
  onCopy: () => void
}

/** P-OWN-PROFILE's Share profile card: picture, level, overall position, 90-day wins, QR and the link. */
export function ProfileShareCard({
  link,
  name,
  nickname,
  picture,
  levelLabel,
  position,
  wins,
  onCopy,
  ...rest
}: ProfileShareCardProps) {
  return (
    <ShareCard
      {...rest}
      compactQr
      link={link}
      fileName="rotra-profile"
      headline={name}
      subline={nickname ? `“${nickname}”` : 'ROTRA player'}
      spot={{
        initials: name
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w[0])
          .slice(0, 2)
          .join(''),
        imageUrl: picture,
      }}
      title={levelLabel ?? 'Not ranked yet'}
      infoLines={[]}
      qrCaption=""
      qrLabel="QR code that opens your profile"
      shareTitle="Share profile"
      noteStart="The QR opens your profile. Private profiles ask visitors to log in."
      actions="both"
      primaryRowAbove={
        <div className="flex w-full flex-col gap-1.5 text-left">
          <label htmlFor="profile-share-link" className="text-sm font-semibold text-fg2">
            Profile link
          </label>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border-strong bg-bg py-2 pr-2 pl-3">
            <input
              id="profile-share-link"
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 font-mono text-[13px] text-fg focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <Button size="xs" onClick={onCopy} aria-label="Copy profile link">
              <Icon name="copy" /> Copy
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-4 text-left">
        <b
          data-qr-text
          className={
            levelLabel
              ? 'text-[22px] leading-[1.1] font-extrabold text-share-accent'
              : 'text-[22px] leading-[1.1] font-extrabold text-share-fg'
          }
        >
          {levelLabel ?? 'Not ranked yet'}
        </b>
        {position ? (
          <div className="flex flex-col gap-0.5">
            <span
              data-qr-text
              className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
            >
              Overall
            </span>
            <b
              data-qr-text
              className="font-mono text-[36px] leading-none font-bold text-share-accent"
            >
              #{position.toLocaleString('en-PH')}
            </b>
          </div>
        ) : null}
        {wins === null ? (
          <b data-qr-text className="text-[15px] text-share-fg">
            No games yet
          </b>
        ) : (
          <div className="flex flex-col gap-2">
            <span
              data-qr-text
              className="text-[11px] font-semibold tracking-[0.5px] text-share-muted uppercase"
            >
              Last 90 days
            </span>
            <div className="flex flex-col gap-0.5">
              <b
                data-qr-text
                className="font-mono text-[20px] leading-[1.1] font-bold text-share-fg"
              >
                {wins}
              </b>
              <span data-qr-text className="text-[10px] text-share-muted">
                Wins
              </span>
            </div>
          </div>
        )}
      </div>
    </ShareCard>
  )
}
