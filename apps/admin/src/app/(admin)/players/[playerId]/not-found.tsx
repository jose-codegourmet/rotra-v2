import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import Link from 'next/link'

/** /players/{id} for an id no player has (rotra-admin.html viewPlayer). */
export default function PlayerNotFound() {
  return (
    <>
      <Breadcrumb label="Players" href="/players" linkAs={Link} />
      <Card>
        <EmptyState title="Player not found." />
      </Card>
    </>
  )
}
