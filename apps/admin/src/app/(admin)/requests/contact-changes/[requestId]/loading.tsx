import { Breadcrumb } from '@rotra/ui/breadcrumb'
import Link from 'next/link'
import { ContactReviewSkeleton } from './_components/contact-review/ContactReviewSkeleton'

export default function ContactReviewLoading() {
  return (
    <>
      <Breadcrumb label="Contact changes" href="/requests/contact-changes" linkAs={Link} />
      <ContactReviewSkeleton />
    </>
  )
}
