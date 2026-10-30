import { ContactReview } from './_components/contact-review/ContactReview'

export default async function ContactReviewPage(
  props: PageProps<'/requests/contact-changes/[requestId]'>,
) {
  const { requestId } = await props.params
  const search = await props.searchParams
  // Already decoded once by Next; it is the list's own query string ("status=…").
  const from = typeof search.from === 'string' ? search.from : ''
  // Keyed: opening another request (a newer one from the checks) starts a fresh review.
  return <ContactReview key={requestId} requestId={requestId} from={from} />
}
