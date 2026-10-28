import type { PlayerProfile } from '@rotra/data/player/types'
import { Avatar } from '@rotra/ui/avatar'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { PlayerIdLine } from '@rotra/ui/player-id-line'
export type PlayerIdentityCardProps = { profile: PlayerProfile; isOwn?: boolean; idElementId: string; onCopyId: () => void }
export function PlayerIdentityCard({ profile, isOwn = false, idElementId, onCopyId }: PlayerIdentityCardProps) {
  return <Card asChild><section className="flex flex-col gap-3.5">
    <div className="flex min-w-0 items-center gap-3.5">
      <Avatar name={profile.fullName} src={profile.picture ?? undefined} size={88} shape="square" tone={profile.picture ? 'neutral' : 'accent'} />
      <div className="flex min-w-0 flex-col gap-2"><h1 className="[overflow-wrap:anywhere]">{profile.fullName}</h1>
        {profile.nickname ? <p className="text-fg2">“{profile.nickname}”</p> : null}
        {isOwn ? <Chip tone="accent">This is you</Chip> : null}
      </div>
    </div>
    <div className="flex flex-col gap-2"><span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Player ID</span>
      <PlayerIdLine rtrId={profile.rtrId} id={idElementId} onCopy={onCopyId} />
      <p className="text-xs text-fg2">Shows the city and date this profile was first created. It isn't where {isOwn ? 'you live or which club you play for' : 'this player lives or which club they play for'}.</p>
    </div>
  </section></Card>
}
