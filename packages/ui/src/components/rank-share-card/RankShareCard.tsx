'use client'
import { Button } from '@rotra/ui/button'
import { ShareCard, type ShareCardProps } from '@rotra/ui/share-card'
import { SkillLadder } from '@rotra/ui/skill-ladder'
export type RankShareCardProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  link: string
  name: string
  nickname?: string | null
  picture?: string | null
  level: number
  levelLabel: string
  position: number | null
  onCopy: () => void
}
export function RankShareCard({
  link,
  name,
  nickname,
  picture,
  level,
  levelLabel,
  position,
  onCopy,
  ...rest
}: RankShareCardProps) {
  return (
    <ShareCard
      {...rest}
      compactQr
      link={link}
      fileName="rotra-rank"
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
      title={levelLabel}
      infoLines={[]}
      qrCaption=""
      qrLabel="QR code for your profile"
      shareTitle="Share rank"
      noteStart="The QR opens your profile. Private profiles ask visitors to log in."
      actions="share-or-download"
      leadingAction={<Button onClick={onCopy}>Copy link</Button>}
    >
      <div className="flex flex-1 flex-col justify-center gap-5 text-left">
        <div className="flex flex-col items-start gap-4">
          <b data-qr-text className="text-[22px] font-extrabold text-share-accent">
            {levelLabel}
          </b>
          <div className="text-left">
            <span data-qr-text className="text-xs text-share-muted">
              Overall
            </span>
            <b
              data-qr-text
              className={
                position
                  ? 'block font-mono text-[36px] leading-none text-share-accent'
                  : 'block text-xl text-share-fg'
              }
            >
              {position ? `#${position}` : 'No position'}
            </b>
          </div>
        </div>
        <SkillLadder level={level} shareCard />
      </div>
    </ShareCard>
  )
}
