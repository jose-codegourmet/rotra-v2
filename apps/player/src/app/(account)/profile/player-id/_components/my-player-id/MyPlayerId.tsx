'use client'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { Button } from '@rotra/ui/button'
import { PageHeader } from '@rotra/ui/page-header'
import { PlayerIdBreakdown } from '@rotra/ui/player-id-breakdown'
import { PlayerIdQr } from '@rotra/ui/player-id-qr'
import { useRouter } from 'next/navigation'
import { copyPlayerId } from '@/app/_components/copy-player-id/copyPlayerId'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'

const ID_ELEMENT = 'my-player-id-big'

export function MyPlayerId() {
  const account = useAppSelector(selectAccount)
  const playerId = account?.id ?? ''
  const profile = usePlayerProfile(playerId)
  const router = useRouter()
  const player = profile.data
  if (!account || !player) return null
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push(`/players/${playerId}`)}
        >
          ← My profile
        </Button>
        <PageHeader
          title="My player ID"
          description="Show this to a club so they can find your profile without your phone number."
        />
      </div>
      <PlayerIdQr
        rtrId={player.rtrId}
        id={ID_ELEMENT}
        onCopy={() => void copyPlayerId(player.rtrId, ID_ELEMENT)}
      />
      <PlayerIdBreakdown rtrId={player.rtrId} />
    </main>
  )
}
