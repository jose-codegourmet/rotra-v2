import type { ContactRequestFilter } from '@rotra/data/contact-change-request/types'
import { ContactRequestsPage } from './_components/contact-request-list-page/ContactRequestsPage'

const STATUS_FILTERS: ContactRequestFilter[] = [
  'pending',
  'applying',
  'failed',
  'applied',
  'rejected',
  'all',
]

export default async function ContactChangesPage(props: PageProps<'/requests/contact-changes'>) {
  const search = await props.searchParams
  // Waiting for review is the default; anything else falls back to it.
  const status = STATUS_FILTERS.find((filter) => filter === search.status) ?? 'pending'
  return <ContactRequestsPage status={status} />
}
