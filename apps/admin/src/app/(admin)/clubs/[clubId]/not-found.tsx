import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import Link from 'next/link'

/** /clubs/{id} for an id no club has (rotra-admin.html viewClub). */
export default function ClubNotFound() {
  return (
    <>
      <Breadcrumb label="Clubs and licenses" href="/clubs" linkAs={Link} />
      <Card>
        <EmptyState title="Club not found." />
      </Card>
    </>
  )
}
