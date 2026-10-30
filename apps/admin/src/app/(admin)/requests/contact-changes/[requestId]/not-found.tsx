import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Card } from '@rotra/ui/card'
import { EmptyState } from '@rotra/ui/empty-state'
import Link from 'next/link'

/** /requests/contact-changes/{id} for an id no request has (rotra-admin.html viewContact). */
export default function ContactRequestNotFound() {
  return (
    <>
      <Breadcrumb label="Contact changes" href="/requests/contact-changes" linkAs={Link} />
      <Card>
        <EmptyState title="Request not found." />
      </Card>
    </>
  )
}
