import { Breadcrumb } from '@rotra/ui/breadcrumb'
import Link from 'next/link'
import { ClubDetailSkeleton } from './_components/club-detail/ClubDetailSkeleton'

export default function ClubDetailLoading() {
  return (
    <>
      <Breadcrumb label="Clubs and licenses" href="/clubs" linkAs={Link} />
      <ClubDetailSkeleton />
    </>
  )
}
