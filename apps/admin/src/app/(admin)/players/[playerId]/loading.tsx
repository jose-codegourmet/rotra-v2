import { Breadcrumb } from '@rotra/ui/breadcrumb'
import Link from 'next/link'
import { PlayerDetailSkeleton } from './_components/player-detail/PlayerDetailSkeleton'

export default function PlayerDetailLoading() {
  return (
    <>
      <Breadcrumb label="Players" href="/players" linkAs={Link} />
      <PlayerDetailSkeleton />
    </>
  )
}
